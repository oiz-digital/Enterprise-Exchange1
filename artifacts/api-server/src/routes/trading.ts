/**
 * Simulated Trading Routes
 *
 * All routes use X-User-Id header for paper-trading user identity.
 * If a valid UUID is provided, that user is used (auto-created wallets).
 * If omitted, a new paper-trading user is auto-created and the ID returned.
 *
 * Endpoints:
 *   POST   /api/v1/trading/users              — create paper user (returns userId)
 *   POST   /api/v1/trading/orders             — place MARKET or LIMIT order
 *   GET    /api/v1/trading/orders             — list user's orders
 *   DELETE /api/v1/trading/orders/:id         — cancel a LIMIT order
 *   GET    /api/v1/trading/balances           — user's wallet balances
 *   GET    /api/v1/trading/trades             — user's trade history
 *   GET    /api/v1/trading/price/:symbol      — current index price
 */

import type { FastifyInstance } from "fastify";
import type { DatabaseRuntime } from "../config/database";
import type { SimulatedTradingEngine } from "../services/simulated-trading-engine";
import type { BinancePriceFeed } from "../services/binance-price-feed";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Deps = {
  database:      DatabaseRuntime;
  tradingEngine: SimulatedTradingEngine;
  priceFeed:     BinancePriceFeed;
};

export async function registerTradingRoutes(app: FastifyInstance, deps: Deps): Promise<void> {
  const { database: { client: sql }, tradingEngine, priceFeed } = deps;

  // ── Helper: resolve / create paper user ──────────────────────────────────

  async function resolvePaperUser(rawId?: string): Promise<string> {
    if (rawId && UUID_RE.test(rawId)) {
      // Check user exists
      const [u] = await sql`SELECT id FROM users WHERE id = ${rawId} AND deleted_at IS NULL LIMIT 1`;
      if (u) return u.id as string;
    }
    // Create new paper user
    const email = `paper-${Date.now()}-${Math.random().toString(36).slice(2)}@sim.zebvix`;
    const [u] = await sql`
      INSERT INTO users (email, status) VALUES (${email}, 'ACTIVE') RETURNING id
    `;
    return u.id as string;
  }

  // ── POST /api/v1/trading/users ────────────────────────────────────────────
  // Create (or retrieve) a paper trading user

  app.post("/api/v1/trading/users", async (req, reply) => {
    const rawId = (req.headers["x-user-id"] as string) | undefined as string | undefined;
    const userId = await resolvePaperUser(rawId);
    return reply.send({ success: true, data: { userId } });
  });

  // ── POST /api/v1/trading/orders ───────────────────────────────────────────

  app.post("/api/v1/trading/orders", {
    schema: {
      body: {
        type: "object",
        required: ["marketSymbol", "side", "type", "quantity"],
        properties: {
          marketSymbol:  { type: "string" },
          side:          { type: "string", enum: ["BUY", "SELL"] },
          type:          { type: "string", enum: ["MARKET", "LIMIT"] },
          quantity:      { type: "string" },
          limitPrice:    { type: "string" },
          clientOrderId: { type: "string" },
        },
      },
    },
  }, async (req, reply) => {
    const rawId  = req.headers["x-user-id"] as string | undefined;
    const userId = await resolvePaperUser(rawId);
    const body   = req.body as {
      marketSymbol: string; side: "BUY"|"SELL"; type: "MARKET"|"LIMIT";
      quantity: string; limitPrice?: string; clientOrderId?: string;
    };

    const result = await tradingEngine.placeOrder({
      userId,
      marketSymbol:  body.marketSymbol,
      side:          body.side,
      type:          body.type,
      quantity:      body.quantity,
      limitPrice:    body.limitPrice,
      clientOrderId: body.clientOrderId,
    });

    return reply.code(201).send({ success: true, data: { userId, ...result } });
  });

  // ── GET /api/v1/trading/orders ────────────────────────────────────────────

  app.get("/api/v1/trading/orders", async (req, reply) => {
    const rawId  = req.headers["x-user-id"] as string | undefined;
    if (!rawId || !UUID_RE.test(rawId)) {
      return reply.code(400).send({ success: false, error: "X-User-Id header required" });
    }
    const query = req.query as { status?: string; market?: string; limit?: string };
    const limit = Math.min(parseInt(query.limit ?? "50"), 200);

    const orders = await sql`
      SELECT o.id, o.client_order_id, o.side, o.type, o.price, o.quantity,
             o.filled_quantity, o.remaining_quantity, o.status,
             o.created_at, o.updated_at,
             m.symbol AS market_symbol,
             ab.symbol AS base_symbol,
             aq.symbol AS quote_symbol
      FROM orders o
      JOIN markets m  ON m.id = o.market_id
      JOIN assets  ab ON ab.id = m.base_asset_id
      JOIN assets  aq ON aq.id = m.quote_asset_id
      WHERE o.user_id = ${rawId}
        ${query.status ? sql`AND o.status = ${query.status}` : sql``}
        ${query.market ? sql`AND m.symbol = ${query.market}` : sql``}
      ORDER BY o.created_at DESC
      LIMIT ${limit}
    `;

    return reply.send({ success: true, data: orders });
  });

  // ── DELETE /api/v1/trading/orders/:id ─────────────────────────────────────

  app.delete("/api/v1/trading/orders/:id", async (req, reply) => {
    const rawId  = req.headers["x-user-id"] as string | undefined;
    if (!rawId || !UUID_RE.test(rawId)) {
      return reply.code(400).send({ success: false, error: "X-User-Id header required" });
    }
    const { id } = req.params as { id: string };
    await tradingEngine.cancelOrder(id, rawId);
    return reply.send({ success: true, data: { orderId: id, status: "CANCELLED" } });
  });

  // ── GET /api/v1/trading/balances ──────────────────────────────────────────

  app.get("/api/v1/trading/balances", async (req, reply) => {
    const rawId = req.headers["x-user-id"] as string | undefined;
    if (!rawId || !UUID_RE.test(rawId)) {
      return reply.code(400).send({ success: false, error: "X-User-Id header required" });
    }

    const balances = await sql`
      SELECT w.available, w.locked, w.updated_at,
             a.symbol, a.name, a.type AS asset_type,
             (a.metadata->>'price_usd')::numeric AS price_usd
      FROM wallets w
      JOIN assets a ON a.id = w.asset_id
      WHERE w.user_id = ${rawId}
        AND w.status  = 'ACTIVE'
      ORDER BY a.symbol
    `;

    // Compute total portfolio value in USDT
    const totalUSDT = balances.reduce((sum, b) => {
      const price = parseFloat(b.price_usd ?? "1");
      return sum + (parseFloat(b.available) + parseFloat(b.locked)) * price;
    }, 0);

    return reply.send({
      success: true,
      data: {
        balances,
        totalUSDT: totalUSDT.toFixed(2),
      },
    });
  });

  // ── GET /api/v1/trading/trades ────────────────────────────────────────────

  app.get("/api/v1/trading/trades", async (req, reply) => {
    const rawId = req.headers["x-user-id"] as string | undefined;
    if (!rawId || !UUID_RE.test(rawId)) {
      return reply.code(400).send({ success: false, error: "X-User-Id header required" });
    }
    const query = req.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit ?? "50"), 200);

    const trades = await sql`
      SELECT t.id, t.price, t.quantity, t.taker_fee AS fee,
             t.settlement_reference, t.created_at,
             m.symbol AS market_symbol,
             o.side,
             ab.symbol AS base_symbol,
             aq.symbol AS quote_symbol
      FROM trades t
      JOIN markets m  ON m.id = t.market_id
      JOIN orders  o  ON o.id = t.taker_order_id
      JOIN assets  ab ON ab.id = m.base_asset_id
      JOIN assets  aq ON aq.id = m.quote_asset_id
      WHERE t.taker_user_id = ${rawId}
      ORDER BY t.created_at DESC
      LIMIT ${limit}
    `;

    return reply.send({ success: true, data: trades });
  });

  // ── GET /api/v1/trading/price/:symbol ────────────────────────────────────

  app.get("/api/v1/trading/price/:symbol", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    const tick = priceFeed.getTick(symbol.toUpperCase());
    if (!tick) {
      return reply.code(404).send({ success: false, error: `No price data for ${symbol}` });
    }
    return reply.send({ success: true, data: tick });
  });

  // ── GET /api/v1/trading/prices ───────────────────────────────────────────
  // Full snapshot of all live prices

  app.get("/api/v1/trading/prices", async (_req, reply) => {
    const snapshot = priceFeed.getSnapshot();
    return reply.send({ success: true, data: snapshot });
  });

  app.log.info("Simulated trading routes registered at /api/v1/trading/*");
}
