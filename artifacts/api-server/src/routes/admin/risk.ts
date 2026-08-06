import type { FastifyInstance } from "fastify";

type Deps = { sql: any };

export async function registerAdminRiskRoutes(app: FastifyInstance, { sql }: Deps) {
  // GET /api/admin/risk
  app.get("/api/admin/risk", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { page = "1", limit = "20", severity, status } = req.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const rows = await sql`
      SELECT r.id, r.severity, r.code, r.description, r.status, r.source,
             r.created_at, r.resolved_at, r.metadata,
             u.email as user_email, u.id as user_id,
             ra.email as resolved_by_email
      FROM risk_flags r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN admin_users ra ON ra.id = r.resolved_by
      WHERE (${severity ?? null}::text IS NULL OR r.severity = ${severity ?? null})
        AND (${status ?? null}::text IS NULL OR r.status = ${status ?? null})
      ORDER BY
        CASE r.severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
        CASE r.status WHEN 'OPEN' THEN 1 WHEN 'REVIEWING' THEN 2 ELSE 3 END,
        r.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${offset}
    `;

    const [{ count }] = await sql`
      SELECT COUNT(*) FROM risk_flags
      WHERE (${severity ?? null}::text IS NULL OR severity = ${severity ?? null})
        AND (${status ?? null}::text IS NULL OR status = ${status ?? null})
    `;

    return reply.send({
      data: rows,
      meta: { total: Number(count), page: Number(page), limit: Number(limit) },
    });
  });

  // PATCH /api/admin/risk/:id
  app.patch("/api/admin/risk/:id", {
    preHandler: [(app as any).verifyAdmin],
    schema: {
      body: {
        type: "object",
        required: ["status"],
        properties: {
          status: { type: "string", enum: ["REVIEWING", "RESOLVED", "DISMISSED"] },
          reason: { type: "string" },
        },
      },
    },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, reason } = req.body as { status: string; reason?: string };

    const resolvedFields = ["RESOLVED", "DISMISSED"].includes(status)
      ? sql`, resolved_by = ${req.adminId}, resolved_at = now()`
      : sql``;

    const [flag] = await sql`
      UPDATE risk_flags
      SET status = ${status}, updated_at = now() ${resolvedFields}
      WHERE id = ${id}
      RETURNING id, status, severity, code
    `;
    if (!flag) return reply.code(404).send({ error: "Risk flag not found" });

    await sql`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, after, reason, ip_address)
      VALUES (${req.adminId}, 'risk.update', 'risk_flag', ${id},
              ${JSON.stringify({ status })}, ${reason ?? null}, ${req.ip})
    `;

    return reply.send({ data: flag });
  });
}
