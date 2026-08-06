import type { FastifyInstance } from "fastify";

type Deps = { sql: any };

export async function registerAdminSettingsRoutes(app: FastifyInstance, { sql }: Deps) {
  // GET /api/admin/settings
  app.get("/api/admin/settings", {
    preHandler: [(app as any).verifyAdmin],
  }, async (_req, reply) => {
    const [settings, flags] = await Promise.all([
      sql`
        SELECT s.id, s.key, s.value, s.description, s.is_secret, s.updated_at,
               a.email as updated_by_email
        FROM system_settings s
        LEFT JOIN admin_users a ON a.id = s.updated_by
        ORDER BY s.key
      `,
      sql`
        SELECT f.id, f.key, f.enabled, f.description, f.updated_at,
               a.email as updated_by_email
        FROM feature_flags f
        LEFT JOIN admin_users a ON a.id = f.updated_by
        ORDER BY f.key
      `,
    ]);
    return reply.send({ data: { settings, flags } });
  });

  // PATCH /api/admin/settings/:key
  app.patch("/api/admin/settings/:key", {
    preHandler: [(app as any).verifyAdmin],
    schema: {
      body: {
        type: "object",
        required: ["value"],
        properties: { value: {} },
      },
    },
  }, async (req, reply) => {
    const { key } = req.params as { key: string };
    const { value } = req.body as { value: unknown };

    const [setting] = await sql`
      UPDATE system_settings
      SET value = ${JSON.stringify(value)},
          updated_by = ${req.adminId},
          updated_at = now()
      WHERE key = ${key}
      RETURNING *
    `;
    if (!setting) return reply.code(404).send({ error: "Setting not found" });

    await sql`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, after, ip_address)
      VALUES (${req.adminId}, 'setting.update', 'setting', ${setting.id},
              ${JSON.stringify({ key, value })}, ${req.ip})
    `;

    return reply.send({ data: setting });
  });

  // PATCH /api/admin/settings/flags/:key
  app.patch("/api/admin/settings/flags/:key", {
    preHandler: [(app as any).verifyAdmin],
    schema: {
      body: {
        type: "object",
        required: ["enabled"],
        properties: { enabled: { type: "boolean" } },
      },
    },
  }, async (req, reply) => {
    const { key } = req.params as { key: string };
    const { enabled } = req.body as { enabled: boolean };

    const [flag] = await sql`
      UPDATE feature_flags
      SET enabled = ${enabled},
          updated_by = ${req.adminId},
          updated_at = now()
      WHERE key = ${key}
      RETURNING *
    `;
    if (!flag) return reply.code(404).send({ error: "Flag not found" });
    return reply.send({ data: flag });
  });
}
