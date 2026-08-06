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
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { orderSideEnum, orderStatusEnum, orderTypeEnum } from "./enums";
import { markets } from "./markets";
import { users } from "./users";
import { assets } from "./assets";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    marketId: uuid("market_id").notNull().references(() => markets.id, { onDelete: "restrict" }),
    clientOrderId: text("client_order_id"),
    side: orderSideEnum("side").notNull(),
    type: orderTypeEnum("type").notNull(),
    price: numeric("price", { precision: 36, scale: 18 }),
    quantity: numeric("quantity", { precision: 36, scale: 18 }).notNull(),
    filledQuantity: numeric("filled_quantity", { precision: 36, scale: 18 }).notNull().default("0"),
    remainingQuantity: numeric("remaining_quantity", { precision: 36, scale: 18 }).notNull(),
    status: orderStatusEnum("status").notNull().default("NEW"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_user_client_order_id_unique").on(table.userId, table.clientOrderId),
    index("orders_user_status_created_at_idx").on(table.userId, table.status, table.createdAt),
    index("orders_market_status_created_at_idx").on(table.marketId, table.status, table.createdAt),
    check("orders_quantity_positive_check", sql`${table.quantity} > 0`),
    check("orders_filled_quantity_check", sql`${table.filledQuantity} >= 0 and ${table.filledQuantity} <= ${table.quantity}`),
    check("orders_remaining_quantity_check", sql`${table.remainingQuantity} >= 0 and ${table.remainingQuantity} <= ${table.quantity}`),
    check("orders_limit_price_check", sql`${table.type} = 'MARKET' or ${table.price} is not null`),
  ],
);

export const trades = pgTable(
  "trades",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    marketId: uuid("market_id").notNull().references(() => markets.id, { onDelete: "restrict" }),
    makerOrderId: uuid("maker_order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
    takerOrderId: uuid("taker_order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
    makerUserId: uuid("maker_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    takerUserId: uuid("taker_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    price: numeric("price", { precision: 36, scale: 18 }).notNull(),
    quantity: numeric("quantity", { precision: 36, scale: 18 }).notNull(),
    makerFee: numeric("maker_fee", { precision: 36, scale: 18 }).notNull().default("0"),
    takerFee: numeric("taker_fee", { precision: 36, scale: 18 }).notNull().default("0"),
    settlementReference: text("settlement_reference"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("trades_settlement_reference_unique").on(table.settlementReference),
    index("trades_market_created_at_idx").on(table.marketId, table.createdAt),
    index("trades_maker_user_created_at_idx").on(table.makerUserId, table.createdAt),
    index("trades_taker_user_created_at_idx").on(table.takerUserId, table.createdAt),
    check("trades_price_positive_check", sql`${table.price} > 0`),
    check("trades_quantity_positive_check", sql`${table.quantity} > 0`),
    check("trades_fees_non_negative_check", sql`${table.makerFee} >= 0 and ${table.takerFee} >= 0`),
  ],
);

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTradeSchema = createInsertSchema(trades).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;