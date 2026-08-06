/**
 * SimulatedTradingEngine
 *
 * A paper-trading engine that executes orders against the live Binance index price.
 * No real money, no real counterparty, no orderbook.
 *
 * Behaviour:
 *  - MARKET orders  → filled immediately at current index price
 *  - LIMIT  orders  → stored as NEW; engine checks every 1 second
 *      BUY  LIMIT   → fills when index price ≤ limit price
 *      SELL LIMIT   → fills when index price ≥ limit price
 *
 * On fill:
 *  1. Order status → FILLED
 *  2. Wallet balances adjusted (locked → available, credit received asset)
 *  3. Ledger transaction + double-entry entries written
 *  4. Trade record written (self-trade: same user on both sides)
 *  5. 'fill' event emitted for WebSocket broadcast
 *
 * Fee: 0.1 % taker rate taken from the received asset.
 * Paper USDT funding: 10 000 USDT auto-credited on first order per new user.
 */

import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { Logger } from "pino";
import type { DatabaseRuntime } from "../config/database";
import type { BinancePriceFeed } from "./binance-price-feed";

const TICK_MS      = 1_000;   // engine tick every 1 second
const TAKER_FEE    = 0.001;   // 0.1 %
const PAPER_USDT   = 10_000;  // virtual USDT given to new paper users

// ─── Public types ─────────────────────────────────────────────────────────

export interface PlaceOrderParams {
  userId:        string;
  marketSymbol:  string;   // e.g. "BTCUSDT"
  side:          "BUY" | "SELL";
  type:          "MARKET" | "LIMIT";
  quantity:      string;   // base asset amount (e.g. "0.01" BTC)
  limitPrice?:   string;   // required for LIMIT
  clientOrderId?: string;
}

export interface FillEvent {
  orderId:    string;
  userId:     string;
  marketSymbol: string;
  side:       "BUY" | "SELL";
  fillPrice:  string;
  quantity:   string;
  fee:        string;
  feeAsset:   string;
  tradeId:    string;
  filledAt:   string;
}

// ─── Engine ───────────────────────────────────────────────────────────────

export class SimulatedTradingEngine extends EventEmitter {
  private db:         DatabaseRuntime;
  private priceFeed:  BinancePriceFeed;
  private logger:     Logger;
  private ticker:     ReturnType<typeof setInterval> | null = null;
  private running  = false;
  private filling  = new Set<string>(); // prevent concurrent fills on same order

  constructor(db: DatabaseRuntime, priceFeed: BinancePriceFeed, logger: Logger) {
    super();
    this.setMaxListeners(256);
    this.db        = db;
    this.priceFeed = priceFeed;
    this.logger    = logger.child({ service: "SimulatedTradingEngine" });
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.ticker  = setInterval(() => void this.tick(), TICK_MS);
    this.logger.info("Simulated trading engine started (1 s tick)");
  }

  stop(): void {
    this.running = false;
    if (this.ticker) { clearInterval(this.ticker); this.ticker = null; }
    this.logger.info("Simulated trading engine stopped");
  }

  // ── Place order (called from route) ────────────────────────────────────

  async placeOrder(params: PlaceOrderParams): Promise<{ orderId: string; status: string }> {
    const { userId, marketSymbol, side, type, quantity, limitPrice, clientOrderId } = params;

    // Resolve market + assets
    const market = await this.getMarket(marketSymbol);
    if (!market) throw new Error(`Market ${marketSymbol} not found or not TRADING`);

    const currentTick = this.priceFeed.getTick(marketSymbol);
    const indexPrice  = currentTick ? parseFloat(currentTick.price) : 0;

    if (type === "MARKET" && indexPrice === 0) {
      throw new Error(`No live price available for ${marketSymbol}`);
    }
    if (type === "LIMIT" && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      throw new Error("limitPrice required and must be > 0 for LIMIT orders");
    }

    const qty = parseFloat(quantity);
    if (qty <= 0) throw new Error("quantity must be > 0");

    // Ensure user + wallets exist (auto-fund paper account)
    await this.ensureUserWallets(userId, market.baseAssetId, market.quoteAssetId);

    if (type === "MARKET") {
      return this.placeAndFillMarket({ userId, market, side, quantity: qty, indexPrice });
    } else {
      return this.placeLimitOrder({ userId, market, side, quantity: qty, limitPrice: parseFloat(limitPrice!), clientOrderId });
    }
  }

  // ── Cancel limit order ──────────────────────────────────────────────────

  async cancelOrder(orderId: string, userId: string): Promise<void> {
    const sql = this.db.client;

    const [order] = await sql`
      SELECT o.*, m.symbol AS market_symbol,
             m.base_asset_id, m.quote_asset_id
      FROM orders o
      JOIN markets m ON m.id = o.market_id
      WHERE o.id = ${orderId} AND o.user_id = ${userId}
    `;

    if (!order)           throw new Error("Order not found");
    if (order.status !== "NEW") throw new Error(`Cannot cancel order with status ${order.status}`);

    await sql.begin(async (tx) => {
      // Unlock held funds
      if (order.side === "BUY") {
        const locked = parseFloat(order.remaining_quantity) * parseFloat(order.price);
        await tx`
          UPDATE wallets SET locked = locked - ${locked.toString()}, updated_at = now()
          WHERE user_id = ${userId} AND asset_id = ${order.quote_asset_id}
        `;
      } else {
        await tx`
          UPDATE wallets SET locked = locked - ${order.remaining_quantity}, updated_at = now()
          WHERE user_id = ${userId} AND asset_id = ${order.base_asset_id}
        `;
      }
      await tx`
        UPDATE orders SET status = 'CANCELLED', updated_at = now()
        WHERE id = ${orderId}
      `;
    });

    this.logger.info({ orderId, userId }, "Order cancelled");
  }

  // ─── Private: Market order (immediate fill) ────────────────────────────

  private async placeAndFillMarket(p: {
    userId: string; market: MarketRow; side: "BUY" | "SELL";
    quantity: number; indexPrice: number;
  }): Promise<{ orderId: string; status: string }> {
    const { userId, market, side, quantity, indexPrice } = p;
    const sql  = this.db.client;

    // Balance check
    await this.checkBalance({ userId, market, side, quantity, fillPrice: indexPrice, isLock: false });

    // Create order + fill in one transaction
    const orderId = await sql.begin(async (tx) => {
      const [order] = await tx`
        INSERT INTO orders (user_id, market_id, side, type, price, quantity,
                            filled_quantity, remaining_quantity, status)
        VALUES (${userId}, ${market.id}, ${side}, 'MARKET',
                ${indexPrice.toString()}, ${quantity.toString()},
                ${quantity.toString()}, '0', 'NEW')
        RETURNING id
      `;
      await this.fillOrderInTx(tx, order.id, userId, market, side, quantity, indexPrice);
      return order.id as string;
    });

    return { orderId, status: "FILLED" };
  }

  // ─── Private: Limit order (store, engine fills later) ─────────────────

  private async placeLimitOrder(p: {
    userId: string; market: MarketRow; side: "BUY" | "SELL";
    quantity: number; limitPrice: number; clientOrderId?: string;
  }): Promise<{ orderId: string; status: string }> {
    const { userId, market, side, quantity, limitPrice, clientOrderId } = p;
    const sql = this.db.client;

    // Lock funds
    await this.lockFunds({ userId, market, side, quantity, limitPrice });

    const [order] = await sql`
      INSERT INTO orders (user_id, market_id, client_order_id, side, type, price,
                          quantity, filled_quantity, remaining_quantity, status)
      VALUES (${userId}, ${market.id}, ${clientOrderId ?? null}, ${side}, 'LIMIT',
              ${limitPrice.toString()}, ${quantity.toString()},
              '0', ${quantity.toString()}, 'NEW')
      RETURNING id
    `;

    this.logger.info({ orderId: order.id, side, limitPrice, qty: quantity }, "Limit order placed");
    return { orderId: order.id as string, status: "NEW" };
  }

  // ─── Engine tick ───────────────────────────────────────────────────────

  private async tick(): Promise<void> {
    if (!this.running) return;
    try {
      // Fetch all open limit orders with market symbol
      const pendingOrders = await this.db.client`
        SELECT o.id, o.user_id, o.side, o.price, o.quantity, o.remaining_quantity,
               m.symbol AS market_symbol, m.id AS market_id,
               m.base_asset_id, m.quote_asset_id
        FROM orders o
        JOIN markets m ON m.id = o.market_id
        WHERE o.status = 'NEW' AND o.type = 'LIMIT'
      `;

      for (const order of pendingOrders) {
        if (this.filling.has(order.id)) continue;

        const tick = this.priceFeed.getTick(order.market_symbol);
        if (!tick) continue;

        const indexPrice  = parseFloat(tick.price);
        const limitPrice  = parseFloat(order.price);
        const qty         = parseFloat(order.remaining_quantity);

        const shouldFill =
          (order.side === "BUY"  && indexPrice <= limitPrice) ||
          (order.side === "SELL" && indexPrice >= limitPrice);

        if (!shouldFill) continue;

        this.filling.add(order.id);
        try {
          await this.db.client.begin(async (tx) => {
            // Re-check status (avoid race)
            const [fresh] = await tx`
              SELECT status FROM orders WHERE id = ${order.id} FOR UPDATE
            `;
            if (fresh?.status !== "NEW") return;

            await this.fillOrderInTx(
              tx,
              order.id,
              order.user_id,
              {
                id: order.market_id,
                symbol: order.market_symbol,
                baseAssetId: order.base_asset_id,
                quoteAssetId: order.quote_asset_id,
              },
              order.side as "BUY" | "SELL",
              qty,
              indexPrice,
            );
          });
          this.logger.info(
            { orderId: order.id, side: order.side, indexPrice, qty },
            "Limit order filled by engine",
          );
        } catch (err) {
          this.logger.error({ err, orderId: order.id }, "Failed to fill limit order");
        } finally {
          this.filling.delete(order.id);
        }
      }
    } catch (err) {
      this.logger.error({ err }, "Engine tick error");
    }
  }

  // ─── Core fill logic (runs inside a DB transaction) ────────────────────

  private async fillOrderInTx(
    tx: ReturnType<DatabaseRuntime["client"]["begin"]> extends Promise<infer T> ? T : never,
    orderId:   string,
    userId:    string,
    market:    { id: string; symbol: string; baseAssetId: string; quoteAssetId: string },
    side:      "BUY" | "SELL",
    quantity:  number,
    fillPrice: number,
  ): Promise<void> {
    const notional = quantity * fillPrice;       // USDT value
    const fee      = notional * TAKER_FEE;      // 0.1 % fee

    // 1. Mark order filled
    await tx`
      UPDATE orders
      SET status = 'FILLED', filled_quantity = quantity,
          remaining_quantity = '0', updated_at = now()
      WHERE id = ${orderId}
    `;

    // 2. Ledger transaction
    const idempKey  = `sim-fill-${orderId}`;
    const [ledgerTx] = await tx`
      INSERT INTO ledger_transactions
        (type, reference_type, reference_id, idempotency_key, description, metadata)
      VALUES (
        'TRADE', 'order', ${orderId}, ${idempKey},
        ${`Simulated ${side} ${quantity} ${market.symbol} @ ${fillPrice}`},
        ${{ engine: "simulated", side, fill_price: fillPrice, quantity, fee }}::jsonb
      )
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING id
    `;
    if (!ledgerTx) return; // already processed (idempotency guard)

    // 3. Trade record (self-trade for simulated engine)
    const settlementRef = `sim-${orderId}`;
    const [trade] = await tx`
      INSERT INTO trades
        (market_id, maker_order_id, taker_order_id,
         maker_user_id, taker_user_id,
         price, quantity, maker_fee, taker_fee, settlement_reference)
      VALUES (
        ${market.id}, ${orderId}, ${orderId},
        ${userId}, ${userId},
        ${fillPrice.toString()}, ${quantity.toString()},
        '0', ${fee.toString()}, ${settlementRef}
      )
      ON CONFLICT (settlement_reference) DO NOTHING
      RETURNING id
    `;

    // 4. Wallet adjustments + ledger entries
    if (side === "BUY") {
      const received = quantity - quantity * TAKER_FEE; // fee in base asset

      // 4a. Deduct locked USDT (cost)
      await tx`
        UPDATE wallets
        SET locked = locked - ${notional.toString()}, updated_at = now()
        WHERE user_id = ${userId} AND asset_id = ${market.quoteAssetId}
      `;
      // 4b. Credit base asset (minus fee)
      await tx`
        INSERT INTO wallets (user_id, asset_id, available, locked)
        VALUES (${userId}, ${market.baseAssetId}, ${received.toString()}, '0')
        ON CONFLICT (user_id, asset_id)
        DO UPDATE SET available = wallets.available + ${received.toString()},
                      updated_at = now()
      `;

      // Ledger entries: debit USDT locked, credit base available
      const [usdtAcct] = await tx`
        SELECT id FROM ledger_accounts
        WHERE user_id = ${userId} AND asset_id = ${market.quoteAssetId} AND type = 'USER_LOCKED'
        LIMIT 1
      `;
      const [baseAcct] = await tx`
        SELECT id FROM ledger_accounts
        WHERE user_id = ${userId} AND asset_id = ${market.baseAssetId} AND type = 'USER_AVAILABLE'
        LIMIT 1
      `;
      if (usdtAcct) {
        await tx`
          INSERT INTO ledger_entries (transaction_id, account_id, asset_id, amount, entry_reference)
          VALUES (${ledgerTx.id}, ${usdtAcct.id}, ${market.quoteAssetId},
                  ${(-notional).toString()}, ${`${ledgerTx.id}-usdt-debit`})
        `;
      }
      if (baseAcct) {
        await tx`
          INSERT INTO ledger_entries (transaction_id, account_id, asset_id, amount, entry_reference)
          VALUES (${ledgerTx.id}, ${baseAcct.id}, ${market.baseAssetId},
                  ${received.toString()}, ${`${ledgerTx.id}-base-credit`})
        `;
      }
    } else {
      // SELL
      const proceeds = notional * (1 - TAKER_FEE); // fee in USDT

      // 4a. Deduct locked base asset
      await tx`
        UPDATE wallets
        SET locked = locked - ${quantity.toString()}, updated_at = now()
        WHERE user_id = ${userId} AND asset_id = ${market.baseAssetId}
      `;
      // 4b. Credit USDT
      await tx`
        INSERT INTO wallets (user_id, asset_id, available, locked)
        VALUES (${userId}, ${market.quoteAssetId}, ${proceeds.toString()}, '0')
        ON CONFLICT (user_id, asset_id)
        DO UPDATE SET available = wallets.available + ${proceeds.toString()},
                      updated_at = now()
      `;

      const [baseAcct] = await tx`
        SELECT id FROM ledger_accounts
        WHERE user_id = ${userId} AND asset_id = ${market.baseAssetId} AND type = 'USER_LOCKED'
        LIMIT 1
      `;
      const [usdtAcct] = await tx`
        SELECT id FROM ledger_accounts
        WHERE user_id = ${userId} AND asset_id = ${market.quoteAssetId} AND type = 'USER_AVAILABLE'
        LIMIT 1
      `;
      if (baseAcct) {
        await tx`
          INSERT INTO ledger_entries (transaction_id, account_id, asset_id, amount, entry_reference)
          VALUES (${ledgerTx.id}, ${baseAcct.id}, ${market.baseAssetId},
                  ${(-quantity).toString()}, ${`${ledgerTx.id}-base-debit`})
        `;
      }
      if (usdtAcct) {
        await tx`
          INSERT INTO ledger_entries (transaction_id, account_id, asset_id, amount, entry_reference)
          VALUES (${ledgerTx.id}, ${usdtAcct.id}, ${market.quoteAssetId},
                  ${proceeds.toString()}, ${`${ledgerTx.id}-usdt-credit`})
        `;
      }
    }

    // 5. Emit fill event for WS broadcast
    const fillEvent: FillEvent = {
      orderId,
      userId,
      marketSymbol: market.symbol,
      side,
      fillPrice:   fillPrice.toString(),
      quantity:    quantity.toString(),
      fee:         fee.toString(),
      feeAsset:    side === "BUY" ? market.baseAssetId : market.quoteAssetId,
      tradeId:     trade?.id ?? "",
      filledAt:    new Date().toISOString(),
    };
    this.emit("fill", fillEvent);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private async getMarket(symbol: string): Promise<MarketRow | null> {
    const [row] = await this.db.client`
      SELECT m.id, m.symbol, m.base_asset_id, m.quote_asset_id
      FROM markets m WHERE m.symbol = ${symbol} AND m.status = 'TRADING' LIMIT 1
    `;
    return (row as MarketRow) ?? null;
  }

  async ensureUserWallets(userId: string, baseAssetId: string, quoteAssetId: string): Promise<void> {
    const sql = this.db.client;

    // Check if user has a USDT wallet; if not → first order, fund paper account
    const [usdtWallet] = await sql`
      SELECT id, available FROM wallets
      WHERE user_id = ${userId} AND asset_id = ${quoteAssetId} LIMIT 1
    `;

    if (!usdtWallet) {
      // First time — give 10 000 paper USDT
      const [wallet] = await sql`
        INSERT INTO wallets (user_id, asset_id, available, locked)
        VALUES (${userId}, ${quoteAssetId}, ${PAPER_USDT.toString()}, '0')
        ON CONFLICT (user_id, asset_id) DO NOTHING
        RETURNING id
      `;
      if (wallet) {
        // Create ledger accounts for USDT
        const acctCode = `${userId}-${quoteAssetId}`;
        await sql`
          INSERT INTO ledger_accounts (user_id, asset_id, type, code)
          VALUES (${userId}, ${quoteAssetId}, 'USER_AVAILABLE', ${`${acctCode}-avail`})
          ON CONFLICT (user_id, asset_id, type) DO NOTHING
        `;
        await sql`
          INSERT INTO ledger_accounts (user_id, asset_id, type, code)
          VALUES (${userId}, ${quoteAssetId}, 'USER_LOCKED', ${`${acctCode}-locked`})
          ON CONFLICT (user_id, asset_id, type) DO NOTHING
        `;
        this.logger.info({ userId, amount: PAPER_USDT }, "Paper USDT funded for new user");
      }
    }

    // Ensure base asset wallet + ledger accounts exist (starts at 0)
    await sql`
      INSERT INTO wallets (user_id, asset_id, available, locked)
      VALUES (${userId}, ${baseAssetId}, '0', '0')
      ON CONFLICT (user_id, asset_id) DO NOTHING
    `;
    const baseCode = `${userId}-${baseAssetId}`;
    await sql`
      INSERT INTO ledger_accounts (user_id, asset_id, type, code)
      VALUES (${userId}, ${baseAssetId}, 'USER_AVAILABLE', ${`${baseCode}-avail`})
      ON CONFLICT (user_id, asset_id, type) DO NOTHING
    `;
    await sql`
      INSERT INTO ledger_accounts (user_id, asset_id, type, code)
      VALUES (${userId}, ${baseAssetId}, 'USER_LOCKED', ${`${baseCode}-locked`})
      ON CONFLICT (user_id, asset_id, type) DO NOTHING
    `;
  }

  private async checkBalance(p: {
    userId: string; market: MarketRow; side: "BUY" | "SELL";
    quantity: number; fillPrice: number; isLock: boolean;
  }): Promise<void> {
    const { userId, market, side, quantity, fillPrice } = p;
    if (side === "BUY") {
      const required = quantity * fillPrice;
      const [w] = await this.db.client`
        SELECT available FROM wallets
        WHERE user_id = ${userId} AND asset_id = ${market.quoteAssetId}
      `;
      if (!w || parseFloat(w.available) < required) {
        throw new Error(
          `Insufficient USDT balance. Required: ${required.toFixed(4)}, Available: ${parseFloat(w?.available ?? "0").toFixed(4)}`,
        );
      }
    } else {
      const [w] = await this.db.client`
        SELECT available FROM wallets
        WHERE user_id = ${userId} AND asset_id = ${market.baseAssetId}
      `;
      if (!w || parseFloat(w.available) < quantity) {
        throw new Error(
          `Insufficient ${market.symbol.replace("USDT", "")} balance. Required: ${quantity}, Available: ${parseFloat(w?.available ?? "0")}`,
        );
      }
    }
  }

  private async lockFunds(p: {
    userId: string; market: MarketRow; side: "BUY" | "SELL";
    quantity: number; limitPrice: number;
  }): Promise<void> {
    const { userId, market, side, quantity, limitPrice } = p;
    if (side === "BUY") {
      const lockAmount = quantity * limitPrice;
      const [w] = await this.db.client`
        SELECT available FROM wallets
        WHERE user_id = ${userId} AND asset_id = ${market.quoteAssetId}
      `;
      if (!w || parseFloat(w.available) < lockAmount) {
        throw new Error(`Insufficient USDT. Need ${lockAmount.toFixed(4)}, have ${parseFloat(w?.available ?? "0").toFixed(4)}`);
      }
      await this.db.client`
        UPDATE wallets
        SET available = available - ${lockAmount.toString()},
            locked    = locked    + ${lockAmount.toString()},
            updated_at = now()
        WHERE user_id = ${userId} AND asset_id = ${market.quoteAssetId}
      `;
    } else {
      const [w] = await this.db.client`
        SELECT available FROM wallets
        WHERE user_id = ${userId} AND asset_id = ${market.baseAssetId}
      `;
      if (!w || parseFloat(w.available) < quantity) {
        throw new Error(`Insufficient base asset. Need ${quantity}, have ${parseFloat(w?.available ?? "0")}`);
      }
      await this.db.client`
        UPDATE wallets
        SET available = available - ${quantity.toString()},
            locked    = locked    + ${quantity.toString()},
            updated_at = now()
        WHERE user_id = ${userId} AND asset_id = ${market.baseAssetId}
      `;
    }
  }
}

// ─── Internal types ────────────────────────────────────────────────────────

interface MarketRow {
  id:           string;
  symbol:       string;
  baseAssetId:  string;
  quoteAssetId: string;
}
