import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { assets } from "./assets";
import { markets } from "./markets";
import { users } from "./users";

export const feeRules = pgTable(
  "fee_rules",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    marketId: uuid("market_id").references(() => markets.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "cascade" }),
    makerRate: numeric("maker_rate", { precision: 18, scale: 8 }).notNull().default("0"),
    takerRate: numeric("taker_rate", { precision: 18, scale: 8 }).notNull().default("0"),
    withdrawalRate: numeric("withdrawal_rate", { precision: 18, scale: 8 }).notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("fee_rules_active_effective_idx").on(table.isActive, table.effectiveFrom),
    index("fee_rules_market_asset_idx").on(table.marketId, table.assetId),
    check("fee_rules_rates_non_negative_check", sql`${table.makerRate} >= 0 and ${table.takerRate} >= 0 and ${table.withdrawalRate} >= 0`),
  ],
);

export const feeRecords = pgTable(
  "fee_records",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    assetId: uuid("asset_id").notNull().references(() => assets.id, { onDelete: "restrict" }),
    ruleId: uuid("rule_id").references(() => feeRules.id, { onDelete: "set null" }),
    referenceType: text("reference_type").notNull(),
    referenceId: uuid("reference_id").notNull(),
    rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
    amount: numeric("amount", { precision: 36, scale: 18 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("fee_records_reference_unique").on(table.referenceType, table.referenceId),
    index("fee_records_user_created_at_idx").on(table.userId, table.createdAt),
    check("fee_records_rate_non_negative_check", sql`${table.rate} >= 0`),
    check("fee_records_amount_non_negative_check", sql`${table.amount} >= 0`),
  ],
);

export const insertFeeRuleSchema = createInsertSchema(feeRules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFeeRecordSchema = createInsertSchema(feeRecords).omit({ id: true, createdAt: true });
export type InsertFeeRule = z.infer<typeof insertFeeRuleSchema>;
export type FeeRule = typeof feeRules.$inferSelect;
export type InsertFeeRecord = z.infer<typeof insertFeeRecordSchema>;
export type FeeRecord = typeof feeRecords.$inferSelect;