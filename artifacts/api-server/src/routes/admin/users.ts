import type { FastifyInstance } from "fastify";

type Deps = { sql: any };

export async function registerAdminUsersRoutes(app: FastifyInstance, { sql }: Deps) {
  // GET /api/admin/users
  app.get("/api/admin/users", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { page = "1", limit = "20", status, kyc, search } = req.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions: string[] = ["u.deleted_at IS NULL"];
    const params: any[] = [];
    let p = 1;

    if (status) { conditions.push(`u.status = $${p++}`); params.push(status); }
    if (kyc) { conditions.push(`k.status = $${p++}`); params.push(kyc); }
    if (search) {
      conditions.push(`(u.email ILIKE $${p} OR u.mobile ILIKE $${p})`);
      params.push(`%${search}%`); p++;
    }

    const where = conditions.join(" AND ");

    const [rows, [{ count }]] = await Promise.all([
      sql.unsafe(`
        SELECT u.id, u.email, u.mobile, u.status, u.created_at, u.last_login_at,
               p.first_name, p.last_name, p.country, p.avatar_url,
               k.status as kyc_status,
               (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as order_count
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        LEFT JOIN kyc_applications k ON k.user_id = u.id
        WHERE ${where}
        ORDER BY u.created_at DESC
        LIMIT ${Number(limit)} OFFSET ${offset}
      `, params),
      sql.unsafe(`
        SELECT COUNT(*) FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        LEFT JOIN kyc_applications k ON k.user_id = u.id
        WHERE ${where}
      `, params),
    ]);

    return reply.send({
      data: rows,
      meta: { total: Number(count), page: Number(page), limit: Number(limit) },
    });
  });

  // GET /api/admin/users/:id
  app.get("/api/admin/users/:id", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const [[user], wallets, orders, deposits, withdrawals, kyc] = await Promise.all([
      sql`
        SELECT u.*, p.first_name, p.last_name, p.country, p.avatar_url,
               p.date_of_birth, p.timezone, p.display_name,
               s.mfa_enabled, s.failed_login_attempts, s.last_login_ip
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        LEFT JOIN user_security s ON s.user_id = u.id
        WHERE u.id = ${id} AND u.deleted_at IS NULL
        LIMIT 1
      `,
      sql`
        SELECT la.id, la.account_type, la.balance, la.locked_balance,
               a.symbol, a.name, a.icon_url
        FROM ledger_accounts la
        JOIN assets a ON a.id = la.asset_id
        WHERE la.user_id = ${id}
        ORDER BY la.balance::numeric DESC
      `,
      sql`
        SELECT o.id, o.side, o.type, o.status, o.quantity, o.filled_quantity,
               o.price, o.created_at, m.symbol
        FROM orders o JOIN markets m ON m.id = o.market_id
        WHERE o.user_id = ${id}
        ORDER BY o.created_at DESC LIMIT 20
      `,
      sql`
        SELECT d.id, d.amount, d.status, d.tx_hash, d.created_at,
               a.symbol, n.name as network
        FROM deposits d
        JOIN assets a ON a.id = d.asset_id
        JOIN networks n ON n.id = d.network_id
        WHERE d.user_id = ${id}
        ORDER BY d.created_at DESC LIMIT 20
      `,
      sql`
        SELECT w.id, w.amount, w.fee, w.status, w.destination, w.created_at,
               a.symbol, n.name as network
        FROM withdrawals w
        JOIN assets a ON a.id = w.asset_id
        JOIN networks n ON n.id = w.network_id
        WHERE w.user_id = ${id}
        ORDER BY w.created_at DESC LIMIT 20
      `,
      sql`
        SELECT id, status, level, submitted_at, reviewed_at, rejection_reason
        FROM kyc_applications WHERE user_id = ${id}
        ORDER BY created_at DESC LIMIT 1
      `,
    ]);

    if (!user) return reply.code(404).send({ error: "User not found" });

    return reply.send({
      data: { ...user, wallets, orders, deposits, withdrawals, kyc: kyc[0] ?? null },
    });
  });

  // PATCH /api/admin/users/:id/status
  app.patch("/api/admin/users/:id/status", {
    preHandler: [(app as any).verifyAdmin],
    schema: {
      body: {
        type: "object",
        required: ["status"],
        properties: { status: { type: "string" }, reason: { type: "string" } },
      },
    },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, reason } = req.body as { status: string; reason?: string };

    const [user] = await sql`
      UPDATE users SET status = ${status}, updated_at = now()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id, email, status
    `;
    if (!user) return reply.code(404).send({ error: "User not found" });

    await sql`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, after, reason, ip_address)
      VALUES (${req.adminId}, 'user.status_change', 'user', ${id},
              ${JSON.stringify({ status })}, ${reason ?? null}, ${req.ip})
    `;

    return reply.send({ data: user });
  });
}
