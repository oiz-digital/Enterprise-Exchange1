/**
 * MockMatchingEngine - Simulates order book with random fills for development.
 * PRODUCTION IMPLEMENTATION REQUIRED before live trading.
 */
import { randomUUID } from "node:crypto";
import type {
  MatchingEngine,
  SubmitOrderParams,
  CancelOrderParams,
  OrderEvent,
} from "./matching-engine.interface";

export class MockMatchingEngine implements MatchingEngine {
  async submitOrder(params: SubmitOrderParams): Promise<OrderEvent[]> {
    const events: OrderEvent[] = [];

    events.push({ type: "ORDER_ACCEPTED", orderId: params.orderId });

    // Simulate random fills for MARKET orders or some LIMIT orders
    const shouldFill = params.type === "MARKET" || Math.random() > 0.3;

    if (shouldFill) {
      const fillQty = params.quantity;
      const price = params.price ?? (params.side === "BUY" ? "67000" : "67000");
      const tradeId = randomUUID();

      events.push({
        type: "TRADE_EXECUTED",
        tradeId,
        makerOrderId: randomUUID(), // In real ME, this would be from the order book
        takerOrderId: params.orderId,
        price,
        quantity: fillQty,
      });

      events.push({
        type: "ORDER_FILLED",
        orderId: params.orderId,
        filledQuantity: fillQty,
        price,
      });
    }

    return events;
  }

  async cancelOrder(params: CancelOrderParams): Promise<OrderEvent[]> {
    return [{ type: "ORDER_CANCELLED", orderId: params.orderId }];
  }

  async getOrder(orderId: string): Promise<{ orderId: string; status: string } | null> {
    return { orderId, status: "NEW" };
  }
}

export const mockMatchingEngine = new MockMatchingEngine();
