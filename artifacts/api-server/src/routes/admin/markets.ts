import type { FastifyInstance } from "fastify";

type Deps = { sql: any };

export async function registerAdminMarketsRoutes(app: FastifyInstance, { sql }: Deps) {
  // GET /api/admin/markets
  app.get("/api/admin/markets", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { page = "1", limit = "50", status, search } = req.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const rows = await sql`
      SELECT m.id, m.symbol, m.status, m.price_precision, m.quantity_precision,
             m.minimum_quantity, m.minimum_notional, m.maker_fee, m.taker_fee,
             m.created_at, m.updated_at,
             ba.symbol as base_symbol, ba.name as base_name, ba.icon_url as base_icon,
             qa.symbol as quote_symbol,
             (SELECT price FROM trades t JOIN markets tm ON tm.id = t.market_id
              WHERE tm.symbol = m.symbol ORDER BY t.created_at DESC LIMIT 1) as last_price,
             (SELECT COUNT(*) FROM orders o WHERE o.market_id = m.id
              AND o.created_at >= now() - interval '24 hours') as orders_24h
      FROM markets m
      JOIN assets ba ON ba.id = m.base_asset_id
      JOIN assets qa ON qa.id = m.quote_asset_id
      WHERE (${status ?? null}::text IS NULL OR m.status = ${status ?? null})
        AND (${search ?? null}::text IS NULL OR m.symbol ILIKE ${'%' + (search ?? '') + '%'})
      ORDER BY m.symbol
      LIMIT ${Number(limit)} OFFSET ${offset}
    `;

    const [{ count }] = await sql`SELECT COUNT(*) FROM markets`;

    return reply.send({
      data: rows,
      meta: { total: Number(count), page: Number(page), limit: Number(limit) },
    });
  });

  // PATCH /api/admin/markets/:id
  app.patch("/api/admin/markets/:id", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, any>;

    const allowed = ["status", "maker_fee", "taker_fee", "minimum_quantity", "minimum_notional",
                     "price_precision", "quantity_precision"];
    const updates: string[] = [];
    const vals: any[] = [];
    let p = 1;
    for (const key of allowed) {
      if (key in body) { updates.push(`${key} = $${p++}`); vals.push(body[key]); }
    }
    if (!updates.length) return reply.code(400).send({ error: "No valid fields" });

    vals.push(id);
    const [market] = await sql.unsafe(
      `UPDATE markets SET ${updates.join(", ")}, updated_at = now()
       WHERE id = $${p} RETURNING *`,
      vals,
    );
    if (!market) return reply.code(404).send({ error: "Market not found" });

    await sql`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, after, ip_address)
      VALUES (${req.adminId}, 'market.update', 'market', ${id},
              ${JSON.stringify(body)}, ${req.ip})
    `;

    return reply.send({ data: market });
  });
}
