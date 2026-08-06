import type { FastifyInstance } from "fastify";

type Deps = { sql: any };

export async function registerAdminP2pRoutes(app: FastifyInstance, { sql }: Deps) {
  // GET /api/admin/p2p/ads
  app.get("/api/admin/p2p/ads", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { page = "1", limit = "20", status } = req.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const rows = await sql`
      SELECT ad.id, ad.type, ad.status, ad.price, ad.quantity, ad.min_order,
             ad.max_order, ad.payment_methods, ad.terms, ad.created_at,
             a.symbol as asset_symbol,
             u.email as advertiser_email,
             COUNT(po.id) as order_count
      FROM p2p_ads ad
      JOIN assets a ON a.id = ad.asset_id
      JOIN users u ON u.id = ad.user_id
      LEFT JOIN p2p_orders po ON po.ad_id = ad.id
      WHERE (${status ?? null}::text IS NULL OR ad.status = ${status ?? null})
      GROUP BY ad.id, a.id, u.id
      ORDER BY ad.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${offset}
    `;

    const [{ count }] = await sql`
      SELECT COUNT(*) FROM p2p_ads
      WHERE (${status ?? null}::text IS NULL OR status = ${status ?? null})
    `;

    return reply.send({
      data: rows,
      meta: { total: Number(count), page: Number(page), limit: Number(limit) },
    });
  });

  // GET /api/admin/p2p/orders
  app.get("/api/admin/p2p/orders", {
    preHandler: [(app as any).verifyAdmin],
  }, async (req, reply) => {
    const { page = "1", limit = "20", status } = req.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const rows = await sql`
      SELECT po.id, po.amount, po.fiat_amount, po.status, po.created_at,
             po.paid_at, po.released_at, po.cancelled_at, po.dispute_reason,
             a.symbol as asset_symbol,
             bu.email as buyer_email,
             su.email as seller_email
      FROM p2p_orders po
      JOIN p2p_ads ad ON ad.id = po.ad_id
      JOIN assets a ON a.id = ad.asset_id
      JOIN users bu ON bu.id = po.buyer_id
      JOIN users su ON su.id = po.seller_id
      WHERE (${status ?? null}::text IS NULL OR po.status = ${status ?? null})
      ORDER BY po.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${offset}
    `;

    const [{ count }] = await sql`
      SELECT COUNT(*) FROM p2p_orders
      WHERE (${status ?? null}::text IS NULL OR status = ${status ?? null})
    `;

    return reply.send({
      data: rows,
      meta: { total: Number(count), page: Number(page), limit: Number(limit) },
    });
  });

  // PATCH /api/admin/p2p/ads/:id/status
  app.patch("/api/admin/p2p/ads/:id/status", {
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

    const [ad] = await sql`
      UPDATE p2p_ads SET status = ${status}, updated_at = now()
      WHERE id = ${id} RETURNING id, status
    `;
    if (!ad) return reply.code(404).send({ error: "Ad not found" });
    return reply.send({ data: ad });
  });
}
