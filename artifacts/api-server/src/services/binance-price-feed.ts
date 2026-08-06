/**
 * BinancePriceFeed
 *
 * Connects to Binance combined WebSocket stream (wss://stream.binance.com)
 * for all USDT trading pairs seeded in the database.
 *
 * - Emits "tick" events for every incoming price update (immediate)
 * - Batches DB writes every DB_WRITE_INTERVAL_MS to avoid hammering postgres
 * - Auto-reconnects with exponential backoff on disconnect / error
 */

import { EventEmitter } from "node:events";
import type { Logger } from "pino";
import type { DatabaseRuntime } from "../config/database";

const BINANCE_WS_BASE = "wss://stream.binance.com:9443/stream";
const DB_WRITE_INTERVAL_MS = 5_000;   // flush price cache to DB every 5 s
const MAX_RECONNECT_DELAY_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 1_000;
// Binance combined stream max per connection
const MAX_STREAMS_PER_CONNECTION = 200;

export interface PriceTick {
  symbol: string;       // e.g. "BTCUSDT"
  baseSymbol: string;   // e.g. "BTC"
  price: string;
  open: string;
  high: string;
  low: string;
  baseVolume: string;
  quoteVolume: string;
  changePercent: string;
  ts: number;
}

// Raw Binance 24hr miniTicker payload
interface BinanceMiniTicker {
  e: "24hrMiniTicker";
  E: number;   // event time
  s: string;   // symbol e.g. BTCUSDT
  c: string;   // close price
  o: string;   // open price
  h: string;   // high
  l: string;   // low
  v: string;   // base asset volume
  q: string;   // quote asset volume
}

interface BinanceCombinedMessage {
  stream: string;
  data: BinanceMiniTicker;
}

export class BinancePriceFeed extends EventEmitter {
  private db: DatabaseRuntime;
  private logger: Logger;

  // symbol (BTCUSDT) → base asset symbol (BTC)
  private symbolMap = new Map<string, string>();

  // Live price cache — always holds latest tick per symbol
  private cache = new Map<string, PriceTick>();

  // Pending DB writes — reset after each flush
  private pendingWrites = new Map<string, PriceTick>();

  private wsInstances: WebSocket[] = [];
  private dbFlushTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectDelay = BASE_RECONNECT_DELAY_MS;
  private stopped = false;

  constructor(db: DatabaseRuntime, logger: Logger) {
    super();
    this.setMaxListeners(512); // many WS clients can subscribe
    this.db = db;
    this.logger = logger.child({ service: "BinancePriceFeed" });
  }

  /** Fetch all USDT markets from DB, then open WS connections */
  async start(): Promise<void> {
    this.stopped = false;
    await this.loadSymbols();
    if (this.symbolMap.size === 0) {
      this.logger.warn("No USDT markets found in DB — price feed not started. Run seed:coins first.");
      return;
    }
    this.openConnections();
    this.startDbFlush();
    this.logger.info({ count: this.symbolMap.size }, "Binance price feed started");
  }

  /** Stop all WS connections and DB flush timer */
  stop(): void {
    this.stopped = true;
    if (this.dbFlushTimer) {
      clearInterval(this.dbFlushTimer);
      this.dbFlushTimer = null;
    }
    for (const ws of this.wsInstances) {
      try { ws.close(); } catch {}
    }
    this.wsInstances = [];
    this.logger.info("Binance price feed stopped");
  }

  /** Returns the full in-memory cache as an array (snapshot for new WS clients) */
  getSnapshot(): PriceTick[] {
    return Array.from(this.cache.values());
  }

  /** Returns the latest tick for a single symbol */
  getTick(symbol: string): PriceTick | undefined {
    return this.cache.get(symbol);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async loadSymbols(): Promise<void> {
    try {
      const rows = await this.db.client`
        SELECT m.symbol AS market_symbol, a.symbol AS base_symbol
        FROM markets m
        JOIN assets a ON a.id = m.base_asset_id
        JOIN assets qa ON qa.id = m.quote_asset_id
        WHERE qa.symbol = 'USDT'
          AND m.status = 'TRADING'
      `;
      this.symbolMap.clear();
      for (const row of rows) {
        this.symbolMap.set(row.market_symbol as string, row.base_symbol as string);
      }
      this.logger.info({ count: this.symbolMap.size }, "Loaded USDT market symbols from DB");
    } catch (err) {
      this.logger.error({ err }, "Failed to load market symbols");
    }
  }

  /**
   * Binance limits combined stream to MAX_STREAMS_PER_CONNECTION streams.
   * Split symbols into chunks and open one WS per chunk.
   */
  private openConnections(): void {
    const symbols = Array.from(this.symbolMap.keys());
    for (let i = 0; i < symbols.length; i += MAX_STREAMS_PER_CONNECTION) {
      const chunk = symbols.slice(i, i + MAX_STREAMS_PER_CONNECTION);
      this.openConnection(chunk);
    }
  }

  private openConnection(symbols: string[]): void {
    const streams = symbols.map((s) => `${s.toLowerCase()}@miniTicker`).join("/");
    const url = `${BINANCE_WS_BASE}?streams=${streams}`;

    const ws = new WebSocket(url);
    this.wsInstances.push(ws);

    ws.addEventListener("open", () => {
      this.reconnectDelay = BASE_RECONNECT_DELAY_MS;
      this.logger.info({ streams: symbols.length }, "Binance WS connected");
    });

    ws.addEventListener("message", (event) => {
      try {
        const msg: BinanceCombinedMessage = JSON.parse(event.data as string);
        const d = msg.data;
        if (d?.e !== "24hrMiniTicker") return;

        const baseSymbol = this.symbolMap.get(d.s);
        if (!baseSymbol) return;

        // Calculate % change
        const close = parseFloat(d.c);
        const open  = parseFloat(d.o);
        const changePercent = open > 0
          ? (((close - open) / open) * 100).toFixed(4)
          : "0.0000";

        const tick: PriceTick = {
          symbol:      d.s,
          baseSymbol,
          price:       d.c,
          open:        d.o,
          high:        d.h,
          low:         d.l,
          baseVolume:  d.v,
          quoteVolume: d.q,
          changePercent,
          ts:          d.E,
        };

        // Update in-memory cache
        this.cache.set(d.s, tick);
        // Queue for DB flush
        this.pendingWrites.set(d.s, tick);
        // Broadcast immediately to all subscribed WS clients
        this.emit("tick", tick);
      } catch (err) {
        this.logger.warn({ err }, "Failed to parse Binance message");
      }
    });

    ws.addEventListener("close", (event) => {
      this.wsInstances = this.wsInstances.filter((w) => w !== ws);
      if (this.stopped) return;
      this.logger.warn(
        { code: event.code, reason: event.reason, delay: this.reconnectDelay },
        "Binance WS closed — reconnecting",
      );
      setTimeout(() => {
        if (!this.stopped) this.openConnection(symbols);
      }, this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
    });

    ws.addEventListener("error", (event) => {
      this.logger.error({ err: (event as ErrorEvent).message }, "Binance WS error");
      try { ws.close(); } catch {}
    });
  }

  /** Flush latest prices to the assets.metadata column every DB_WRITE_INTERVAL_MS */
  private startDbFlush(): void {
    this.dbFlushTimer = setInterval(async () => {
      if (this.pendingWrites.size === 0) return;

      const writes = Array.from(this.pendingWrites.values());
      this.pendingWrites.clear();

      try {
        // Batch-update each asset's metadata JSONB with latest price data.
        // Uses postgres || (merge) operator so existing metadata keys are preserved.
        await Promise.all(
          writes.map((tick) =>
            this.db.client`
              UPDATE assets
              SET metadata   = metadata || ${JSON.stringify({
                price_usd:           parseFloat(tick.price),
                open_usd:            parseFloat(tick.open),
                high_24h:            parseFloat(tick.high),
                low_24h:             parseFloat(tick.low),
                price_change_pct_24h: parseFloat(tick.changePercent),
                volume_24h_usdt:     parseFloat(tick.quoteVolume),
                source:              "binance_ws",
                fetched_at:          new Date(tick.ts).toISOString(),
              })}::jsonb,
                  updated_at = now()
              WHERE symbol = ${tick.baseSymbol}
            `,
          ),
        );
        this.logger.debug({ count: writes.length }, "Flushed prices to DB");
      } catch (err) {
        this.logger.error({ err }, "DB price flush failed");
      }
    }, DB_WRITE_INTERVAL_MS);
  }
}
