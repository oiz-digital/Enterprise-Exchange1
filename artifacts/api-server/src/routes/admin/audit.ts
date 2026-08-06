import type { FastifyInstance } from "fastify";

type Deps = { sql: any };

export async function registerAdminAuditRoutes(app: FastifyInstance, { sql }: Deps) {
  // GET /api/admin/audit
  app.get("/api/admin/audit", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { page = "1", limit = "50", action, adminId, targetType } = req.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions: string[] = [];
    const vals: any[] = [];
    let p = 1;
    if (action) { conditions.push(`al.action ILIKE $${p++}`); vals.push(`%${action}%`); }
    if (adminId) { conditions.push(`al.admin_id = $${p++}`); vals.push(adminId); }
    if (targetType) { conditions.push(`al.target_type = $${p++}`); vals.push(targetType); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    vals.push(Number(limit), offset);

    const rows = await sql.unsafe(`
      SELECT al.id, al.action, al.target_type, al.target_id, al.reason,
             al.ip_address, al.created_at, al.before, al.after,
             a.email as admin_email
      FROM audit_logs al
      LEFT JOIN admin_users a ON a.id = al.admin_id
      ${where}
      ORDER BY al.created_at DESC
      LIMIT $${p++} OFFSET $${p}
    `, vals);

    const [{ count }] = await sql.unsafe(
      `SELECT COUNT(*) FROM audit_logs al ${where}`,
      vals.slice(0, -2),
    );

    return reply.send({
      data: rows,
      meta: { total: Number(count), page: Number(page), limit: Number(limit) },
    });
  });
}
