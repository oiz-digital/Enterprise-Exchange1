import { randomBytes } from "node:crypto";
import type {
  MarketDataProvider,
  TickerData,
  Ticker24hData,
  OrderBookData,
  TradeData,
  CandleData,
} from "./market-data.provider";

const BASE_PRICES: Record<string, number> = {
  BTCUSDT: 67000,
  ETHUSDT: 3500,
  ZBXUSDT: 1.50,
};

function jitter(base: number, pct = 0.001): number {
  return base * (1 + (Math.random() - 0.5) * pct * 2);
}

function rand16(): string {
  return randomBytes(8).toString("hex");
}

export class MockMarketDataProvider implements MarketDataProvider {
  async getTicker(symbol: string): Promise<TickerData> {
    const base = BASE_PRICES[symbol] ?? 100;
    const price = jitter(base);
    return {
      symbol,
      price: price.toFixed(2),
      bid: (price * 0.9999).toFixed(2),
      ask: (price * 1.0001).toFixed(2),
      timestamp: Date.now(),
    };
  }

  async getTicker24h(symbol: string): Promise<Ticker24hData> {
    const base = BASE_PRICES[symbol] ?? 100;
    const last = jitter(base);
    const open = jitter(base, 0.02);
    const high = Math.max(last, open) * 1.015;
    const low = Math.min(last, open) * 0.985;
    const change = last - open;
    const changePct = (change / open) * 100;
    return {
      symbol,
      openPrice: open.toFixed(2),
      highPrice: high.toFixed(2),
      lowPrice: low.toFixed(2),
      lastPrice: last.toFixed(2),
      volume: (Math.random() * 1000 + 100).toFixed(4),
      quoteVolume: (Math.random() * 1000000 + 100000).toFixed(2),
      priceChange: change.toFixed(2),
      priceChangePercent: changePct.toFixed(2),
      timestamp: Date.now(),
    };
  }

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBookData> {
    const base = BASE_PRICES[symbol] ?? 100;
    const price = jitter(base);

    const bids: { price: string; quantity: string }[] = [];
    const asks: { price: string; quantity: string }[] = [];

    for (let i = 0; i < depth; i++) {
      bids.push({
        price: (price * (1 - (i + 1) * 0.0001)).toFixed(2),
        quantity: (Math.random() * 2 + 0.01).toFixed(6),
      });
      asks.push({
        price: (price * (1 + (i + 1) * 0.0001)).toFixed(2),
        quantity: (Math.random() * 2 + 0.01).toFixed(6),
      });
    }

    return { symbol, bids, asks, timestamp: Date.now() };
  }

  async getRecentTrades(symbol: string, limit = 50): Promise<TradeData[]> {
    const base = BASE_PRICES[symbol] ?? 100;
    const trades: TradeData[] = [];
    for (let i = 0; i < limit; i++) {
      trades.push({
        id: rand16(),
        price: jitter(base).toFixed(2),
        quantity: (Math.random() * 1 + 0.001).toFixed(6),
        side: Math.random() > 0.5 ? "BUY" : "SELL",
        timestamp: Date.now() - i * 1000,
      });
    }
    return trades;
  }

  async getCandles(symbol: string, _interval: string, limit = 100): Promise<CandleData[]> {
    const base = BASE_PRICES[symbol] ?? 100;
    const candles: CandleData[] = [];
    let price = base;
    const now = Date.now();
    const intervalMs = 60000; // 1 minute default

    for (let i = limit - 1; i >= 0; i--) {
      const open = jitter(price, 0.005);
      const close = jitter(price, 0.005);
      const high = Math.max(open, close) * 1.003;
      const low = Math.min(open, close) * 0.997;
      candles.push({
        openTime: now - i * intervalMs,
        open: open.toFixed(2),
        high: high.toFixed(2),
        low: low.toFixed(2),
        close: close.toFixed(2),
        volume: (Math.random() * 100 + 10).toFixed(4),
        closeTime: now - i * intervalMs + intervalMs - 1,
      });
      price = close;
    }
    return candles;
  }
}

export const mockMarketDataProvider = new MockMarketDataProvider();
