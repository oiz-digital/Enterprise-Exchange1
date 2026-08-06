import type { FastifyInstance } from "fastify";

type Deps = { sql: any };

export async function registerAdminAssetsRoutes(app: FastifyInstance, { sql }: Deps) {
  // GET /api/admin/assets
  app.get("/api/admin/assets", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { page = "1", limit = "50", type, status } = req.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const rows = await sql`
      SELECT a.id, a.symbol, a.name, a.type, a.status, a.precision,
             a.display_precision, a.icon_url,
             a.deposit_enabled, a.withdrawal_enabled, a.trading_enabled,
             a.created_at, a.updated_at,
             (SELECT COUNT(*) FROM asset_networks an WHERE an.asset_id = a.id) as network_count,
             (SELECT COUNT(*) FROM markets m WHERE m.base_asset_id = a.id OR m.quote_asset_id = a.id) as market_count
      FROM assets a
      WHERE (${type ?? null}::text IS NULL OR a.type = ${type ?? null})
        AND (${status ?? null}::text IS NULL OR a.status = ${status ?? null})
      ORDER BY a.symbol
      LIMIT ${Number(limit)} OFFSET ${offset}
    `;

    const [{ count }] = await sql`SELECT COUNT(*) FROM assets`;

    return reply.send({
      data: rows,
      meta: { total: Number(count), page: Number(page), limit: Number(limit) },
    });
  });

  // PATCH /api/admin/assets/:id
  app.patch("/api/admin/assets/:id", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, any>;

    const allowed = ["status", "deposit_enabled", "withdrawal_enabled", "trading_enabled",
                     "icon_url", "name", "display_precision"];
    const updates: string[] = [];
    const vals: any[] = [];
    let p = 1;
    for (const key of allowed) {
      if (key in body) { updates.push(`${key} = $${p++}`); vals.push(body[key]); }
    }
    if (!updates.length) return reply.code(400).send({ error: "No valid fields" });

    vals.push(id);
    const [asset] = await sql.unsafe(
      `UPDATE assets SET ${updates.join(", ")}, updated_at = now()
       WHERE id = $${p} RETURNING *`,
      vals,
    );
    if (!asset) return reply.code(404).send({ error: "Asset not found" });

    await sql`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, after, ip_address)
      VALUES (${req.adminId}, 'asset.update', 'asset', ${id}, ${JSON.stringify(body)}, ${req.ip})
    `;

    return reply.send({ data: asset });
  });

  // GET /api/admin/networks
  app.get("/api/admin/networks", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const rows = await sql`
      SELECT n.id, n.code, n.name, n.chain_id, n.explorer_url, n.status, n.created_at,
             na.symbol as native_asset_symbol,
             (SELECT COUNT(*) FROM asset_networks an WHERE an.network_id = n.id) as asset_count
      FROM networks n
      LEFT JOIN assets na ON na.id = n.native_asset_id
      ORDER BY n.name
    `;
    return reply.send({ data: rows });
  });

  // PATCH /api/admin/networks/:id
  app.patch("/api/admin/networks/:id", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, any>;

    const allowed = ["status", "name", "explorer_url"];
    const updates: string[] = [];
    const vals: any[] = [];
    let p = 1;
    for (const key of allowed) {
      if (key in body) { updates.push(`${key} = $${p++}`); vals.push(body[key]); }
    }
    if (!updates.length) return reply.code(400).send({ error: "No valid fields" });

    vals.push(id);
    const [network] = await sql.unsafe(
      `UPDATE networks SET ${updates.join(", ")}, updated_at = now()
       WHERE id = $${p} RETURNING *`,
      vals,
    );
    if (!network) return reply.code(404).send({ error: "Network not found" });
    return reply.send({ data: network });
  });
}
