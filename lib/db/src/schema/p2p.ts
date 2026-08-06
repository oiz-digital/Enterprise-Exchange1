import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { p2pAdStatusEnum, p2pOrderStatusEnum } from "./enums";
import { assets } from "./assets";
import { users } from "./users";

export const p2pAds = pgTable(
  "p2p_ads",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    assetId: uuid("asset_id").notNull().references(() => assets.id, { onDelete: "restrict" }),
    side: text("side").notNull(),
    price: numeric("price", { precision: 36, scale: 18 }).notNull(),
    availableAmount: numeric("available_amount", { precision: 36, scale: 18 }).notNull(),
    minOrderAmount: numeric("min_order_amount", { precision: 36, scale: 18 }).notNull(),
    maxOrderAmount: numeric("max_order_amount", { precision: 36, scale: 18 }).notNull(),
    paymentMethods: jsonb("payment_methods").$type<string[]>().notNull().default([]),
    status: p2pAdStatusEnum("status").notNull().default("DRAFT"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("p2p_ads_asset_status_idx").on(table.assetId, table.status),
    index("p2p_ads_user_status_idx").on(table.userId, table.status),
    check("p2p_ads_price_positive_check", sql`${table.price} > 0`),
    check("p2p_ads_available_amount_check", sql`${table.availableAmount} > 0`),
    check(
      "p2p_ads_order_bounds_check",
      sql`${table.minOrderAmount} > 0 and ${table.maxOrderAmount} >= ${table.minOrderAmount}`,
    ),
  ],
);

export const p2pOrders = pgTable(
  "p2p_orders",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    adId: uuid("ad_id").notNull().references(() => p2pAds.id, { onDelete: "restrict" }),
    buyerId: uuid("buyer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    sellerId: uuid("seller_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    assetId: uuid("asset_id").notNull().references(() => assets.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 36, scale: 18 }).notNull(),
    fiatAmount: numeric("fiat_amount", { precision: 36, scale: 18 }).notNull(),
    currency: text("currency").notNull(),
    status: p2pOrderStatusEnum("status").notNull().default("CREATED"),
    paymentReference: text("payment_reference"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("p2p_orders_buyer_status_idx").on(table.buyerId, table.status),
    index("p2p_orders_seller_status_idx").on(table.sellerId, table.status),
    check("p2p_orders_amount_positive_check", sql`${table.amount} > 0`),
    check("p2p_orders_fiat_amount_positive_check", sql`${table.fiatAmount} > 0`),
  ],
);

export const insertP2pAdSchema = createInsertSchema(p2pAds).omit({ id: true, createdAt: true, updatedAt: true });
export const insertP2pOrderSchema = createInsertSchema(p2pOrders).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertP2pAd = z.infer<typeof insertP2pAdSchema>;
export type P2pAd = typeof p2pAds.$inferSelect;
export type InsertP2pOrder = z.infer<typeof insertP2pOrderSchema>;
export type P2pOrder = typeof p2pOrders.$inferSelect;