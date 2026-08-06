import type { FastifyInstance } from "fastify";

type Deps = { sql: any };

export async function registerAdminOrdersRoutes(app: FastifyInstance, { sql }: Deps) {
  // GET /api/admin/orders
  app.get("/api/admin/orders", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { page = "1", limit = "20", status, side, market, userId } = req.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions: string[] = [];
    const vals: any[] = [];
    let p = 1;
    if (status) { conditions.push(`o.status = $${p++}`); vals.push(status); }
    if (side) { conditions.push(`o.side = $${p++}`); vals.push(side); }
    if (market) { conditions.push(`m.symbol = $${p++}`); vals.push(market); }
    if (userId) { conditions.push(`o.user_id = $${p++}`); vals.push(userId); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    vals.push(Number(limit), offset);
    const rows = await sql.unsafe(`
      SELECT o.id, o.side, o.type, o.status, o.quantity, o.filled_quantity,
             o.remaining_quantity, o.price, o.created_at, o.updated_at,
             m.symbol as market,
             u.email as user_email,
             ROUND((o.filled_quantity::numeric / NULLIF(o.quantity::numeric, 0)) * 100, 2) as fill_pct
      FROM orders o
      JOIN markets m ON m.id = o.market_id
      JOIN users u ON u.id = o.user_id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT $${p++} OFFSET $${p}
    `, vals);

    const [{ count }] = await sql.unsafe(
      `SELECT COUNT(*) FROM orders o
       JOIN markets m ON m.id = o.market_id
       JOIN users u ON u.id = o.user_id ${where}`,
      vals.slice(0, -2),
    );

    return reply.send({
      data: rows,
      meta: { total: Number(count), page: Number(page), limit: Number(limit) },
    });
  });

  // GET /api/admin/trades
  app.get("/api/admin/trades", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { page = "1", limit = "20", market, userId } = req.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions: string[] = [];
    const vals: any[] = [];
    let p = 1;
    if (market) { conditions.push(`m.symbol = $${p++}`); vals.push(market); }
    if (userId) {
      conditions.push(`(t.maker_user_id = $${p} OR t.taker_user_id = $${p})`);
      vals.push(userId); p++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    vals.push(Number(limit), offset);

    const rows = await sql.unsafe(`
      SELECT t.id, t.price, t.quantity, t.maker_fee, t.taker_fee, t.created_at,
             m.symbol as market,
             mu.email as maker_email,
             tu.email as taker_email,
             ROUND(t.price::numeric * t.quantity::numeric, 8) as notional
      FROM trades t
      JOIN markets m ON m.id = t.market_id
      JOIN users mu ON mu.id = t.maker_user_id
      JOIN users tu ON tu.id = t.taker_user_id
      ${where}
      ORDER BY t.created_at DESC
      LIMIT $${p++} OFFSET $${p}
    `, vals);

    const [{ count }] = await sql.unsafe(
      `SELECT COUNT(*) FROM trades t
       JOIN markets m ON m.id = t.market_id ${where}`,
      vals.slice(0, -2),
    );

    return reply.send({
      data: rows,
      meta: { total: Number(count), page: Number(page), limit: Number(limit) },
    });
  });
}
