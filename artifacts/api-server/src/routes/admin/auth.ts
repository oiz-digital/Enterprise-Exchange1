import type { FastifyInstance } from "fastify";
import { verify as argonVerify } from "@node-rs/argon2";
import { signAccessToken } from "../../utils/jwt.js";
import type { AppEnv } from "../../config/env.js";

type Deps = { sql: any; env: AppEnv };

export async function registerAdminAuthRoutes(app: FastifyInstance, { sql, env }: Deps) {
  // POST /api/admin/auth/login
  app.post("/api/admin/auth/login", {
    schema: {
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string" },
          password: { type: "string" },
        },
      },
    },
  }, async (req, reply) => {
    const { email, password } = req.body as { email: string; password: string };

    const [admin] = await sql`
      SELECT a.id, a.email, a.password_hash, a.status, a.failed_login_attempts,
             a.locked_until, r.code as role
      FROM admin_users a
      LEFT JOIN admin_roles ar ON ar.admin_id = a.id
      LEFT JOIN roles r ON r.id = ar.role_id
      WHERE a.email = ${email.toLowerCase().trim()}
        AND a.deleted_at IS NULL
      LIMIT 1
    `;

    if (!admin) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }
    if (admin.status === "DISABLED") {
      return reply.code(403).send({ error: "Account disabled" });
    }
    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      return reply.code(403).send({ error: "Account temporarily locked" });
    }

    const valid = await argonVerify(admin.password_hash, password);
    if (!valid) {
      await sql`
        UPDATE admin_users
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE WHEN failed_login_attempts + 1 >= 5
              THEN now() + interval '15 minutes' ELSE NULL END,
            updated_at = now()
        WHERE id = ${admin.id}
      `;
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    await sql`
      UPDATE admin_users
      SET failed_login_attempts = 0,
          locked_until = NULL,
          last_login_at = now(),
          last_login_ip = ${req.ip},
          updated_at = now()
      WHERE id = ${admin.id}
    `;

    const token = await signAccessToken(
      { sub: admin.id, role: admin.role, type: "admin" },
      env,
    );

    return reply.send({
      data: {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          status: admin.status,
        },
      },
    });
  });

  // GET /api/admin/auth/me
  app.get("/api/admin/auth/me", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const [admin] = await sql`
      SELECT a.id, a.email, a.status, a.mfa_enabled, a.last_login_at,
             a.created_at, r.code as role, r.display_name as role_name
      FROM admin_users a
      LEFT JOIN admin_roles ar ON ar.admin_id = a.id
      LEFT JOIN roles r ON r.id = ar.role_id
      WHERE a.id = ${req.adminId} AND a.deleted_at IS NULL
      LIMIT 1
    `;
    if (!admin) return reply.code(404).send({ error: "Not found" });
    return reply.send({ data: admin });
  });
}
