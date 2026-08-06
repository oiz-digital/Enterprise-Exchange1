import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { marketStatusEnum } from "./enums";
import { assets } from "./assets";

export const markets = pgTable(
  "markets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    symbol: text("symbol").notNull(),
    baseAssetId: uuid("base_asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
    quoteAssetId: uuid("quote_asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
    status: marketStatusEnum("status").notNull().default("PRE_TRADING"),
    pricePrecision: integer("price_precision").notNull().default(8),
    quantityPrecision: integer("quantity_precision").notNull().default(8),
    minimumQuantity: numeric("minimum_quantity", { precision: 36, scale: 18 }).notNull().default("0"),
    minimumNotional: numeric("minimum_notional", { precision: 36, scale: 18 }).notNull().default("0"),
    makerFee: numeric("maker_fee", { precision: 18, scale: 8 }).notNull().default("0"),
    takerFee: numeric("taker_fee", { precision: 18, scale: 8 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("markets_symbol_unique").on(table.symbol),
    uniqueIndex("markets_asset_pair_unique").on(table.baseAssetId, table.quoteAssetId),
    index("markets_status_idx").on(table.status),
    check("markets_distinct_assets_check", sql`${table.baseAssetId} <> ${table.quoteAssetId}`),
    check("markets_price_precision_check", sql`${table.pricePrecision} between 0 and 36`),
    check("markets_quantity_precision_check", sql`${table.quantityPrecision} between 0 and 36`),
    check("markets_minimum_quantity_check", sql`${table.minimumQuantity} >= 0`),
    check("markets_minimum_notional_check", sql`${table.minimumNotional} >= 0`),
    check("markets_maker_fee_check", sql`${table.makerFee} >= 0`),
    check("markets_taker_fee_check", sql`${table.takerFee} >= 0`),
  ],
);

export const insertMarketSchema = createInsertSchema(markets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMarket = z.infer<typeof insertMarketSchema>;
export type Market = typeof markets.$inferSelect;