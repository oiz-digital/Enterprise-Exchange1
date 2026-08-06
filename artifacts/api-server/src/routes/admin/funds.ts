import type { FastifyInstance } from "fastify";

type Deps = { sql: any };

export async function registerAdminFundsRoutes(app: FastifyInstance, { sql }: Deps) {
  // GET /api/admin/deposits
  app.get("/api/admin/deposits", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { page = "1", limit = "20", status, userId, assetId } = req.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions: string[] = [];
    const vals: any[] = [];
    let p = 1;
    if (status) { conditions.push(`d.status = $${p++}`); vals.push(status); }
    if (userId) { conditions.push(`d.user_id = $${p++}`); vals.push(userId); }
    if (assetId) { conditions.push(`d.asset_id = $${p++}`); vals.push(assetId); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    vals.push(Number(limit), offset);

    const rows = await sql.unsafe(`
      SELECT d.id, d.amount, d.status, d.tx_hash, d.confirmations,
             d.required_confirmations, d.address, d.created_at, d.credited_at,
             a.symbol as asset, a.icon_url as asset_icon,
             n.name as network, n.explorer_url,
             u.email as user_email
      FROM deposits d
      JOIN assets a ON a.id = d.asset_id
      JOIN networks n ON n.id = d.network_id
      JOIN users u ON u.id = d.user_id
      ${where}
      ORDER BY d.created_at DESC
      LIMIT $${p++} OFFSET $${p}
    `, vals);

    const [{ count }] = await sql.unsafe(
      `SELECT COUNT(*) FROM deposits d
       JOIN assets a ON a.id = d.asset_id
       JOIN users u ON u.id = d.user_id ${where}`,
      vals.slice(0, -2),
    );

    return reply.send({
      data: rows,
      meta: { total: Number(count), page: Number(page), limit: Number(limit) },
    });
  });

  // GET /api/admin/withdrawals
  app.get("/api/admin/withdrawals", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { page = "1", limit = "20", status, riskStatus, userId } = req.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions: string[] = [];
    const vals: any[] = [];
    let p = 1;
    if (status) { conditions.push(`w.status = $${p++}`); vals.push(status); }
    if (riskStatus) { conditions.push(`w.risk_status = $${p++}`); vals.push(riskStatus); }
    if (userId) { conditions.push(`w.user_id = $${p++}`); vals.push(userId); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    vals.push(Number(limit), offset);

    const rows = await sql.unsafe(`
      SELECT w.id, w.amount, w.fee, w.status, w.risk_status, w.destination,
             w.tx_hash, w.created_at, w.requested_at, w.review_reason,
             a.symbol as asset, a.icon_url as asset_icon,
             n.name as network,
             u.email as user_email
      FROM withdrawals w
      JOIN assets a ON a.id = w.asset_id
      JOIN networks n ON n.id = w.network_id
      JOIN users u ON u.id = w.user_id
      ${where}
      ORDER BY w.created_at DESC
      LIMIT $${p++} OFFSET $${p}
    `, vals);

    const [{ count }] = await sql.unsafe(
      `SELECT COUNT(*) FROM withdrawals w
       JOIN users u ON u.id = w.user_id ${where}`,
      vals.slice(0, -2),
    );

    return reply.send({
      data: rows,
      meta: { total: Number(count), page: Number(page), limit: Number(limit) },
    });
  });

  // PATCH /api/admin/withdrawals/:id/review
  app.patch("/api/admin/withdrawals/:id/review", {
    preHandler: [(app as any).verifyAdmin],
    schema: {
      body: {
        type: "object",
        required: ["action"],
        properties: {
          action: { type: "string", enum: ["approve", "reject"] },
          reason: { type: "string" },
        },
      },
    },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { action, reason } = req.body as { action: string; reason?: string };

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    const [w] = await sql`
      UPDATE withdrawals
      SET status = ${newStatus},
          reviewed_at = now(),
          reviewed_by_admin_id = ${req.adminId},
          review_reason = ${reason ?? null},
          updated_at = now()
      WHERE id = ${id} AND status IN ('REQUESTED','PENDING_APPROVAL','RISK_REVIEW')
      RETURNING id, status, amount, user_id
    `;
    if (!w) return reply.code(404).send({ error: "Withdrawal not found or already reviewed" });

    await sql`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, after, reason, ip_address)
      VALUES (${req.adminId}, ${`withdrawal.${action}`}, 'withdrawal', ${id},
              ${JSON.stringify({ status: newStatus })}, ${reason ?? null}, ${req.ip})
    `;

    return reply.send({ data: w });
  });
}
