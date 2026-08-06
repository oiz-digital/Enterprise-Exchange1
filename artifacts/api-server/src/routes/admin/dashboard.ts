import type { FastifyInstance } from "fastify";

type Deps = { sql: any };

export async function registerAdminDashboardRoutes(app: FastifyInstance, { sql }: Deps) {
  // GET /api/admin/dashboard
  app.get("/api/admin/dashboard", {
    preHandler: [(app as any).verifyAdmin],
  }, async (_req, reply) => {
    const [[userStats], [orderStats], [tradeStats], [depositStats], [withdrawalStats]] =
      await Promise.all([
        sql`
          SELECT
            COUNT(*) FILTER (WHERE deleted_at IS NULL) as total,
            COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'ACTIVE') as active,
            COUNT(*) FILTER (WHERE deleted_at IS NULL AND created_at >= now() - interval '24 hours') as new_today,
            COUNT(*) FILTER (WHERE deleted_at IS NULL AND created_at >= now() - interval '7 days') as new_week
          FROM users
        `,
        sql`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'NEW') as open,
            COUNT(*) FILTER (WHERE status = 'FILLED') as filled,
            COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours') as today
          FROM orders
        `,
        sql`
          SELECT
            COUNT(*) as total,
            COALESCE(SUM(quantity::numeric * price::numeric), 0) as volume_24h
          FROM trades
          WHERE created_at >= now() - interval '24 hours'
        `,
        sql`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status IN ('DETECTED','CONFIRMING')) as pending,
            COALESCE(SUM(amount::numeric) FILTER (WHERE status = 'CREDITED' AND created_at >= now() - interval '24 hours'), 0) as volume_24h
          FROM deposits
        `,
        sql`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status IN ('REQUESTED','PENDING_APPROVAL','RISK_REVIEW')) as pending,
            COALESCE(SUM(amount::numeric) FILTER (WHERE status = 'COMPLETED' AND completed_at >= now() - interval '24 hours'), 0) as volume_24h
          FROM withdrawals
        `,
      ]);

    // Recent users
    const recentUsers = await sql`
      SELECT u.id, u.email, u.status, u.created_at,
             p.first_name, p.last_name, p.country,
             k.status as kyc_status
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      LEFT JOIN kyc_applications k ON k.user_id = u.id
      WHERE u.deleted_at IS NULL
      ORDER BY u.created_at DESC
      LIMIT 10
    `;

    // Risk alerts
    const riskAlerts = await sql`
      SELECT r.id, r.severity, r.code, r.description, r.status, r.created_at,
             u.email as user_email
      FROM risk_flags r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.status IN ('OPEN','REVIEWING')
      ORDER BY CASE r.severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,
               r.created_at DESC
      LIMIT 10
    `;

    // Volume chart (last 14 days)
    const volumeChart = await sql`
      SELECT
        date_trunc('day', created_at)::date as date,
        COALESCE(SUM(quantity::numeric * price::numeric), 0) as volume,
        COUNT(*) as trades
      FROM trades
      WHERE created_at >= now() - interval '14 days'
      GROUP BY 1
      ORDER BY 1
    `;

    // Pending KYC count
    const [[kycStats]] = await Promise.all([
      sql`
        SELECT COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
               COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW') as under_review
        FROM kyc_applications
      `,
    ]);

    return reply.send({
      data: {
        users: userStats,
        orders: orderStats,
        trades: tradeStats,
        deposits: depositStats,
        withdrawals: withdrawalStats,
        kyc: kycStats,
        recentUsers,
        riskAlerts,
        volumeChart,
      },
    });
  });
}
