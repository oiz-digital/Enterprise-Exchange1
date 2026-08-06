import type { FastifyInstance } from "fastify";
import { hash } from "@node-rs/argon2";

type Deps = { sql: any };

export async function registerAdminAdminsRoutes(app: FastifyInstance, { sql }: Deps) {
  // GET /api/admin/admins
  app.get("/api/admin/admins", {
    preHandler: [(app as any).verifyAdmin],
  }, async (_req, reply) => {
    const rows = await sql`
      SELECT a.id, a.email, a.status, a.mfa_enabled, a.last_login_at,
             a.failed_login_attempts, a.created_at, a.deleted_at,
             r.code as role, r.display_name as role_name
      FROM admin_users a
      LEFT JOIN admin_roles ar ON ar.admin_id = a.id
      LEFT JOIN roles r ON r.id = ar.role_id
      WHERE a.deleted_at IS NULL
      ORDER BY a.created_at DESC
    `;
    return reply.send({ data: rows });
  });

  // POST /api/admin/admins
  app.post("/api/admin/admins", {
    preHandler: [(app as any).verifyAdmin],
    schema: {
      body: {
        type: "object",
        required: ["email", "password", "roleCode"],
        properties: {
          email: { type: "string" },
          password: { type: "string", minLength: 12 },
          roleCode: { type: "string" },
        },
      },
    },
  }, async (req, reply) => {
    const { email, password, roleCode } = req.body as any;

    const passwordHash = await hash(password, {
      algorithm: 2, memoryCost: 65536, timeCost: 3, parallelism: 4,
    });

    const [role] = await sql`SELECT id FROM roles WHERE code = ${roleCode} LIMIT 1`;
    if (!role) return reply.code(400).send({ error: "Invalid role code" });

    const [admin] = await sql`
      INSERT INTO admin_users (email, password_hash, status)
      VALUES (${email.toLowerCase()}, ${passwordHash}, 'ACTIVE')
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email, status
    `;
    if (!admin) return reply.code(409).send({ error: "Email already exists" });

    await sql`
      INSERT INTO admin_roles (admin_id, role_id, assigned_by)
      VALUES (${admin.id}, ${role.id}, ${req.adminId})
    `;

    await sql`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, after, ip_address)
      VALUES (${req.adminId}, 'admin.create', 'admin_user', ${admin.id},
              ${JSON.stringify({ email, roleCode })}, ${req.ip})
    `;

    return reply.code(201).send({ data: { ...admin, role: roleCode } });
  });

  // PATCH /api/admin/admins/:id/status
  app.patch("/api/admin/admins/:id/status", {
    preHandler: [(app as any).verifyAdmin],
    schema: {
      body: {
        type: "object",
        required: ["status"],
        properties: { status: { type: "string" } },
      },
    },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: string };

    if (id === req.adminId) return reply.code(400).send({ error: "Cannot change own status" });

    const [admin] = await sql`
      UPDATE admin_users SET status = ${status}, updated_at = now()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id, email, status
    `;
    if (!admin) return reply.code(404).send({ error: "Admin not found" });

    return reply.send({ data: admin });
  });

  // GET /api/admin/roles
  app.get("/api/admin/roles", {
    preHandler: [(app as any).verifyAdmin],
  }, async (_req, reply) => {
    const rows = await sql`
      SELECT r.id, r.code, r.display_name, r.description, r.is_system, r.created_at,
             COUNT(ar.admin_id) as admin_count,
             ARRAY_AGG(p.code ORDER BY p.code) FILTER (WHERE p.code IS NOT NULL) as permissions
      FROM roles r
      LEFT JOIN admin_roles ar ON ar.role_id = r.id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      GROUP BY r.id
      ORDER BY r.is_system DESC, r.code
    `;
    return reply.send({ data: rows });
  });
}
