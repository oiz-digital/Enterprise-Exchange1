import type { FastifyInstance } from "fastify";

type Deps = { sql: any };

export async function registerAdminKycRoutes(app: FastifyInstance, { sql }: Deps) {
  // GET /api/admin/kyc
  app.get("/api/admin/kyc", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { page = "1", limit = "20", status } = req.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const rows = await sql`
      SELECT k.id, k.status, k.level, k.submitted_at, k.reviewed_at, k.rejection_reason,
             k.created_at, k.updated_at,
             u.email as user_email, u.id as user_id,
             p.first_name, p.last_name, p.country,
             ra.email as reviewer_email
      FROM kyc_applications k
      JOIN users u ON u.id = k.user_id
      LEFT JOIN user_profiles p ON p.user_id = u.id
      LEFT JOIN admin_users ra ON ra.id = k.reviewed_by
      WHERE (${status ?? null}::text IS NULL OR k.status = ${status ?? null})
      ORDER BY
        CASE k.status WHEN 'PENDING' THEN 1 WHEN 'UNDER_REVIEW' THEN 2 ELSE 3 END,
        k.submitted_at ASC NULLS LAST,
        k.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${offset}
    `;

    const [{ count }] = await sql`
      SELECT COUNT(*) FROM kyc_applications
      WHERE (${status ?? null}::text IS NULL OR status = ${status ?? null})
    `;

    return reply.send({
      data: rows,
      meta: { total: Number(count), page: Number(page), limit: Number(limit) },
    });
  });

  // GET /api/admin/kyc/:id
  app.get("/api/admin/kyc/:id", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const [[application], documents, reviews] = await Promise.all([
      sql`
        SELECT k.*, u.email as user_email, p.first_name, p.last_name, p.country, p.date_of_birth
        FROM kyc_applications k
        JOIN users u ON u.id = k.user_id
        LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE k.id = ${id} LIMIT 1
      `,
      sql`SELECT * FROM kyc_documents WHERE application_id = ${id} ORDER BY created_at`,
      sql`
        SELECT kr.*, a.email as reviewer_email
        FROM kyc_reviews kr
        LEFT JOIN admin_users a ON a.id = kr.reviewer_id
        WHERE kr.application_id = ${id}
        ORDER BY kr.created_at DESC
      `,
    ]);

    if (!application) return reply.code(404).send({ error: "Application not found" });
    return reply.send({ data: { ...application, documents, reviews } });
  });

  // PATCH /api/admin/kyc/:id/review
  app.patch("/api/admin/kyc/:id/review", {
    preHandler: [(app as any).verifyAdmin],
    schema: {
      body: {
        type: "object",
        required: ["action"],
        properties: {
          action: { type: "string", enum: ["approve", "reject", "request_resubmission"] },
          reason: { type: "string" },
        },
      },
    },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { action, reason } = req.body as { action: string; reason?: string };

    const statusMap: Record<string, string> = {
      approve: "APPROVED",
      reject: "REJECTED",
      request_resubmission: "RESUBMISSION_REQUIRED",
    };
    const newStatus = statusMap[action];

    const [app_] = await sql`
      SELECT id, status, user_id FROM kyc_applications
      WHERE id = ${id} LIMIT 1
    `;
    if (!app_) return reply.code(404).send({ error: "Application not found" });

    await sql`
      UPDATE kyc_applications
      SET status = ${newStatus},
          reviewed_at = now(),
          reviewed_by = ${req.adminId},
          rejection_reason = ${reason ?? null},
          updated_at = now()
      WHERE id = ${id}
    `;

    await sql`
      INSERT INTO kyc_reviews (application_id, reviewer_id, from_status, to_status, reason)
      VALUES (${id}, ${req.adminId}, ${app_.status}, ${newStatus}, ${reason ?? null})
    `;

    await sql`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, after, reason, ip_address)
      VALUES (${req.adminId}, ${`kyc.${action}`}, 'kyc_application', ${id},
              ${JSON.stringify({ status: newStatus })}, ${reason ?? null}, ${req.ip})
    `;

    return reply.send({ data: { id, status: newStatus } });
  });
}
