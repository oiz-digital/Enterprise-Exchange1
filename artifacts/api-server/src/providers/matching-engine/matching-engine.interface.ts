export type SubmitOrderParams = {
  orderId: string;
  marketId: string;
  userId: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  quantity: string;
  price?: string;
};

export type CancelOrderParams = {
  orderId: string;
  marketId: string;
  userId: string;
};

export type OrderEvent =
  | { type: "ORDER_ACCEPTED"; orderId: string }
  | { type: "ORDER_PARTIALLY_FILLED"; orderId: string; filledQuantity: string; price: string }
  | { type: "ORDER_FILLED"; orderId: string; filledQuantity: string; price: string }
  | { type: "ORDER_CANCELLED"; orderId: string }
  | { type: "TRADE_EXECUTED"; tradeId: string; makerOrderId: string; takerOrderId: string; price: string; quantity: string };

export interface MatchingEngine {
  submitOrder(params: SubmitOrderParams): Promise<OrderEvent[]>;
  cancelOrder(params: CancelOrderParams): Promise<OrderEvent[]>;
  getOrder(orderId: string): Promise<{ orderId: string; status: string } | null>;
}
