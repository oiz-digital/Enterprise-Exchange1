import type { FastifyInstance } from "fastify";

type Deps = { sql: any };

export async function registerAdminStakingRoutes(app: FastifyInstance, { sql }: Deps) {
  // GET /api/admin/staking/products
  app.get("/api/admin/staking/products", {
    preHandler: [(app as any).verifyAdmin],
  }, async (_req, reply) => {
    const rows = await sql`
      SELECT sp.id, sp.name, sp.apy, sp.lock_days, sp.min_amount, sp.max_amount,
             sp.status, sp.created_at, sp.updated_at,
             a.symbol as asset_symbol, a.name as asset_name, a.icon_url,
             COUNT(pos.id) as position_count,
             COALESCE(SUM(pos.amount::numeric), 0) as total_staked
      FROM staking_products sp
      JOIN assets a ON a.id = sp.asset_id
      LEFT JOIN staking_positions pos ON pos.product_id = sp.id AND pos.status = 'ACTIVE'
      GROUP BY sp.id, a.id
      ORDER BY sp.created_at DESC
    `;
    return reply.send({ data: rows });
  });

  // GET /api/admin/staking/positions
  app.get("/api/admin/staking/positions", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { page = "1", limit = "20", status } = req.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const rows = await sql`
      SELECT pos.id, pos.amount, pos.reward_earned, pos.status,
             pos.staked_at, pos.unstaked_at, pos.matures_at,
             sp.name as product_name, sp.apy,
             a.symbol as asset_symbol,
             u.email as user_email
      FROM staking_positions pos
      JOIN staking_products sp ON sp.id = pos.product_id
      JOIN assets a ON a.id = sp.asset_id
      JOIN users u ON u.id = pos.user_id
      WHERE (${status ?? null}::text IS NULL OR pos.status = ${status ?? null})
      ORDER BY pos.staked_at DESC
      LIMIT ${Number(limit)} OFFSET ${offset}
    `;

    const [{ count }] = await sql`
      SELECT COUNT(*) FROM staking_positions
      WHERE (${status ?? null}::text IS NULL OR status = ${status ?? null})
    `;

    return reply.send({
      data: rows,
      meta: { total: Number(count), page: Number(page), limit: Number(limit) },
    });
  });

  // PATCH /api/admin/staking/products/:id
  app.patch("/api/admin/staking/products/:id", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, any>;

    const fieldMap: Record<string, string> = {
      status: "status", apy: "apy", minAmount: "min_amount",
      maxAmount: "max_amount", name: "name",
    };

    const updates: string[] = [];
    const vals: any[] = [];
    let p = 1;
    for (const [jsKey, dbKey] of Object.entries(fieldMap)) {
      if (jsKey in body) { updates.push(`${dbKey} = $${p++}`); vals.push(body[jsKey]); }
    }
    if (!updates.length) return reply.code(400).send({ error: "No valid fields" });

    vals.push(id);
    const [product] = await sql.unsafe(
      `UPDATE staking_products SET ${updates.join(", ")}, updated_at = now()
       WHERE id = $${p} RETURNING *`,
      vals,
    );
    if (!product) return reply.code(404).send({ error: "Product not found" });
    return reply.send({ data: product });
  });
}
