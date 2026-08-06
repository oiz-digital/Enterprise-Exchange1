import type { FastifyInstance } from "fastify";

type Deps = { sql: any };

export async function registerAdminFeesRoutes(app: FastifyInstance, { sql }: Deps) {
  // GET /api/admin/fees
  app.get("/api/admin/fees", {
    preHandler: [(app as any).verifyAdmin],
  }, async (_req, reply) => {
    const rules = await sql`
      SELECT fr.id, fr.name, fr.maker_rate, fr.taker_rate, fr.withdrawal_rate,
             fr.is_active, fr.effective_from, fr.effective_to, fr.created_at,
             m.symbol as market_symbol,
             a.symbol as asset_symbol
      FROM fee_rules fr
      LEFT JOIN markets m ON m.id = fr.market_id
      LEFT JOIN assets a ON a.id = fr.asset_id
      ORDER BY fr.market_id IS NULL DESC, fr.is_active DESC, fr.created_at
    `;
    return reply.send({ data: rules });
  });

  // POST /api/admin/fees
  app.post("/api/admin/fees", {
    preHandler: [(app as any).verifyAdmin],
    schema: {
      body: {
        type: "object",
        required: ["name", "makerRate", "takerRate", "withdrawalRate"],
        properties: {
          name: { type: "string" },
          makerRate: { type: "number" },
          takerRate: { type: "number" },
          withdrawalRate: { type: "number" },
          marketId: { type: "string" },
          assetId: { type: "string" },
        },
      },
    },
  }, async (req, reply) => {
    const { name, makerRate, takerRate, withdrawalRate, marketId, assetId } = req.body as any;

    const [rule] = await sql`
      INSERT INTO fee_rules (name, maker_rate, taker_rate, withdrawal_rate, market_id, asset_id)
      VALUES (${name}, ${makerRate}, ${takerRate}, ${withdrawalRate},
              ${marketId ?? null}, ${assetId ?? null})
      RETURNING *
    `;

    await sql`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, after, ip_address)
      VALUES (${req.adminId}, 'fee_rule.create', 'fee_rule', ${rule.id},
              ${JSON.stringify({ name, makerRate, takerRate, withdrawalRate })}, ${req.ip})
    `;

    return reply.code(201).send({ data: rule });
  });

  // PATCH /api/admin/fees/:id
  app.patch("/api/admin/fees/:id", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, any>;

    const fieldMap: Record<string, string> = {
      name: "name", makerRate: "maker_rate", takerRate: "taker_rate",
      withdrawalRate: "withdrawal_rate", isActive: "is_active",
      effectiveTo: "effective_to",
    };

    const updates: string[] = [];
    const vals: any[] = [];
    let p = 1;
    for (const [jsKey, dbKey] of Object.entries(fieldMap)) {
      if (jsKey in body) { updates.push(`${dbKey} = $${p++}`); vals.push(body[jsKey]); }
    }
    if (!updates.length) return reply.code(400).send({ error: "No valid fields" });

    vals.push(id);
    const [rule] = await sql.unsafe(
      `UPDATE fee_rules SET ${updates.join(", ")}, updated_at = now()
       WHERE id = $${p} RETURNING *`,
      vals,
    );
    if (!rule) return reply.code(404).send({ error: "Rule not found" });
    return reply.send({ data: rule });
  });

  // GET /api/admin/fees/records — recent fee income
  app.get("/api/admin/fees/records", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { limit = "50" } = req.query as any;
    const rows = await sql`
      SELECT fr.id, fr.amount, fr.rate, fr.reference_type, fr.created_at,
             a.symbol as asset, u.email as user_email
      FROM fee_records fr
      JOIN assets a ON a.id = fr.asset_id
      JOIN users u ON u.id = fr.user_id
      ORDER BY fr.created_at DESC
      LIMIT ${Number(limit)}
    `;
    return reply.send({ data: rows });
  });
}
