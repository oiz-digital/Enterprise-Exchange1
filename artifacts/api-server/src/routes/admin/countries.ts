import type { FastifyInstance } from "fastify";

type Deps = { sql: any };

export async function registerAdminCountriesRoutes(app: FastifyInstance, { sql }: Deps) {
  // GET /api/admin/countries — list all with search/filter
  app.get("/api/admin/countries", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { search, active } = req.query as { search?: string; active?: string };

    const rows = await sql`
      SELECT id, name, code, dial_code, flag_emoji,
             is_active, is_registration_allowed,
             created_at, updated_at
      FROM countries
      WHERE (
        ${search ? sql`lower(name) LIKE ${'%' + search.toLowerCase() + '%'} OR lower(code) LIKE ${'%' + search.toLowerCase() + '%'}` : sql`TRUE`}
      )
      AND (
        ${active !== undefined ? sql`is_active = ${active === 'true'}` : sql`TRUE`}
      )
      ORDER BY name ASC
    `;

    return reply.send({ data: rows });
  });

  // PATCH /api/admin/countries/:id — toggle active / registration
  app.patch("/api/admin/countries/:id", {
    preHandler: [(app as any).verifyAdmin],
    schema: {
      body: {
        type: "object",
        properties: {
          isActive: { type: "boolean" },
          isRegistrationAllowed: { type: "boolean" },
        },
      },
    },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { isActive?: boolean; isRegistrationAllowed?: boolean };

    const [updated] = await sql`
      UPDATE countries
      SET
        is_active = COALESCE(${body.isActive ?? null}, is_active),
        is_registration_allowed = COALESCE(${body.isRegistrationAllowed ?? null}, is_registration_allowed),
        updated_at = now()
      WHERE id = ${parseInt(id, 10)}
      RETURNING *
    `;

    if (!updated) return reply.code(404).send({ error: "Country not found" });

    await sql`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, after, ip_address)
      VALUES (
        ${req.adminId}, 'country.update', 'country', ${id},
        ${JSON.stringify(body)}, ${req.ip}
      )
    `;

    return reply.send({ data: updated });
  });

  // PATCH /api/admin/countries/:id/toggle-active — quick toggle
  app.patch("/api/admin/countries/:id/toggle-active", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const [updated] = await sql`
      UPDATE countries
      SET is_active = NOT is_active, updated_at = now()
      WHERE id = ${parseInt(id, 10)}
      RETURNING *
    `;
    if (!updated) return reply.code(404).send({ error: "Country not found" });

    await sql`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, after, ip_address)
      VALUES (
        ${req.adminId}, 'country.toggle', 'country', ${id},
        ${JSON.stringify({ isActive: updated.is_active })}, ${req.ip}
      )
    `;

    return reply.send({ data: updated });
  });

  // PATCH /api/admin/countries/:id/toggle-registration
  app.patch("/api/admin/countries/:id/toggle-registration", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const [updated] = await sql`
      UPDATE countries
      SET is_registration_allowed = NOT is_registration_allowed, updated_at = now()
      WHERE id = ${parseInt(id, 10)}
      RETURNING *
    `;
    if (!updated) return reply.code(404).send({ error: "Country not found" });

    return reply.send({ data: updated });
  });

  // POST /api/admin/countries/bulk-toggle — bulk enable/disable
  app.post("/api/admin/countries/bulk-toggle", {
    preHandler: [(app as any).verifyAdmin],
    schema: {
      body: {
        type: "object",
        required: ["ids", "isActive"],
        properties: {
          ids: { type: "array", items: { type: "number" } },
          isActive: { type: "boolean" },
        },
      },
    },
  }, async (req, reply) => {
    const { ids, isActive } = req.body as { ids: number[]; isActive: boolean };

    await sql`
      UPDATE countries
      SET is_active = ${isActive}, updated_at = now()
      WHERE id = ANY(${ids}::int[])
    `;

    return reply.send({ data: { updated: ids.length } });
  });
}
