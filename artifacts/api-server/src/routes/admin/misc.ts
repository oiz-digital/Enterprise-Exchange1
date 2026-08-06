import type { FastifyInstance } from "fastify";

type Deps = { sql: any };

export async function registerAdminMiscRoutes(app: FastifyInstance, { sql }: Deps) {
  // GET /api/admin/referrals
  app.get("/api/admin/referrals", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { page = "1", limit = "20" } = req.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const rows = await sql`
      SELECT r.id, r.status, r.created_at,
             ref.email as referrer_email,
             ref_u.email as referred_email,
             COALESCE(SUM(rw.amount::numeric), 0) as total_rewards
      FROM referrals r
      JOIN users ref ON ref.id = r.referrer_id
      JOIN users ref_u ON ref_u.id = r.referred_id
      LEFT JOIN referral_rewards rw ON rw.referral_id = r.id
      GROUP BY r.id, ref.id, ref_u.id
      ORDER BY r.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${offset}
    `;

    const [{ count }] = await sql`SELECT COUNT(*) FROM referrals`;

    return reply.send({
      data: rows,
      meta: { total: Number(count), page: Number(page), limit: Number(limit) },
    });
  });

  // GET /api/admin/notifications
  app.get("/api/admin/notifications", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { page = "1", limit = "20", type, channel } = req.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const rows = await sql`
      SELECT n.id, n.type, n.channel, n.subject, n.body, n.read_at,
             n.sent_at, n.created_at, n.metadata,
             u.email as user_email
      FROM notifications n
      JOIN users u ON u.id = n.user_id
      WHERE (${type ?? null}::text IS NULL OR n.type = ${type ?? null})
        AND (${channel ?? null}::text IS NULL OR n.channel = ${channel ?? null})
      ORDER BY n.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${offset}
    `;

    const [{ count }] = await sql`
      SELECT COUNT(*) FROM notifications
      WHERE (${type ?? null}::text IS NULL OR type = ${type ?? null})
        AND (${channel ?? null}::text IS NULL OR channel = ${channel ?? null})
    `;

    return reply.send({
      data: rows,
      meta: { total: Number(count), page: Number(page), limit: Number(limit) },
    });
  });

  // GET /api/admin/reports
  app.get("/api/admin/reports", {
    preHandler: [(app as any).verifyAdmin],
  }, async (_req, reply) => {
    const [userGrowth, tradeVolume, feeRevenue, depositVolume, withdrawalVolume] =
      await Promise.all([
        sql`
          SELECT date_trunc('day', created_at)::date as date,
                 COUNT(*) as new_users
          FROM users WHERE deleted_at IS NULL
            AND created_at >= now() - interval '30 days'
          GROUP BY 1 ORDER BY 1
        `,
        sql`
          SELECT date_trunc('day', created_at)::date as date,
                 COUNT(*) as trades,
                 COALESCE(SUM(quantity::numeric * price::numeric), 0) as volume
          FROM trades WHERE created_at >= now() - interval '30 days'
          GROUP BY 1 ORDER BY 1
        `,
        sql`
          SELECT date_trunc('day', created_at)::date as date,
                 COALESCE(SUM(amount::numeric), 0) as fees
          FROM fee_records WHERE created_at >= now() - interval '30 days'
          GROUP BY 1 ORDER BY 1
        `,
        sql`
          SELECT date_trunc('day', created_at)::date as date,
                 COUNT(*) as count,
                 COALESCE(SUM(amount::numeric), 0) as volume
          FROM deposits WHERE status = 'CREDITED'
            AND created_at >= now() - interval '30 days'
          GROUP BY 1 ORDER BY 1
        `,
        sql`
          SELECT date_trunc('day', requested_at)::date as date,
                 COUNT(*) as count,
                 COALESCE(SUM(amount::numeric), 0) as volume
          FROM withdrawals WHERE status = 'COMPLETED'
            AND requested_at >= now() - interval '30 days'
          GROUP BY 1 ORDER BY 1
        `,
      ]);

    return reply.send({
      data: { userGrowth, tradeVolume, feeRevenue, depositVolume, withdrawalVolume },
    });
  });
}
