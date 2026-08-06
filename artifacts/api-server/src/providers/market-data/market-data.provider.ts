export type TickerData = {
  symbol: string;
  price: string;
  bid: string;
  ask: string;
  timestamp: number;
};

export type Ticker24hData = {
  symbol: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  lastPrice: string;
  volume: string;
  quoteVolume: string;
  priceChange: string;
  priceChangePercent: string;
  timestamp: number;
};

export type OrderBookEntry = {
  price: string;
  quantity: string;
};

export type OrderBookData = {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: number;
};

export type TradeData = {
  id: string;
  price: string;
  quantity: string;
  side: "BUY" | "SELL";
  timestamp: number;
};

export type CandleData = {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
};

export interface MarketDataProvider {
  getTicker(symbol: string): Promise<TickerData>;
  getTicker24h(symbol: string): Promise<Ticker24hData>;
  getOrderBook(symbol: string, depth?: number): Promise<OrderBookData>;
  getRecentTrades(symbol: string, limit?: number): Promise<TradeData[]>;
  getCandles(symbol: string, interval: string, limit?: number): Promise<CandleData[]>;
}
