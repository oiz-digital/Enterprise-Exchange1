import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { depositStatusEnum, withdrawalRiskStatusEnum, withdrawalStatusEnum } from "./enums";
import { assets, networks } from "./assets";
import { adminUsers } from "./admin";
import { users } from "./users";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const deposits = pgTable(
  "deposits",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    assetId: uuid("asset_id").notNull().references(() => assets.id, { onDelete: "restrict" }),
    networkId: uuid("network_id").notNull().references(() => networks.id, { onDelete: "restrict" }),
    address: text("address").notNull(),
    memo: text("memo"),
    externalReference: text("external_reference"),
    txHash: text("tx_hash"),
    amount: numeric("amount", { precision: 36, scale: 18 }).notNull(),
    confirmations: integer("confirmations").notNull().default(0),
    requiredConfirmations: integer("required_confirmations").notNull(),
    status: depositStatusEnum("status").notNull().default("DETECTED"),
    detectedAt: timestamp("detected_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    creditedAt: timestamp("credited_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("deposits_external_reference_unique").on(table.externalReference),
    uniqueIndex("deposits_network_tx_hash_unique").on(table.networkId, table.txHash),
    index("deposits_user_created_at_idx").on(table.userId, table.createdAt),
    index("deposits_status_created_at_idx").on(table.status, table.createdAt),
    check("deposits_amount_positive_check", sql`${table.amount} > 0`),
    check("deposits_confirmations_non_negative_check", sql`${table.confirmations} >= 0`),
    check("deposits_required_confirmations_check", sql`${table.requiredConfirmations} >= 0`),
  ],
);

export const withdrawals = pgTable(
  "withdrawals",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    assetId: uuid("asset_id").notNull().references(() => assets.id, { onDelete: "restrict" }),
    networkId: uuid("network_id").notNull().references(() => networks.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 36, scale: 18 }).notNull(),
    fee: numeric("fee", { precision: 36, scale: 18 }).notNull().default("0"),
    destination: text("destination").notNull(),
    memo: text("memo"),
    status: withdrawalStatusEnum("status").notNull().default("REQUESTED"),
    riskStatus: withdrawalRiskStatusEnum("risk_status").notNull().default("PENDING"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    broadcastAt: timestamp("broadcast_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    txHash: text("tx_hash"),
    requestedByAdminId: uuid("requested_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    reviewedByAdminId: uuid("reviewed_by_admin_id").references(() => adminUsers.id, { onDelete: "set null" }),
    reviewReason: text("review_reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [
    index("withdrawals_user_created_at_idx").on(table.userId, table.createdAt),
    index("withdrawals_status_created_at_idx").on(table.status, table.createdAt),
    index("withdrawals_risk_status_idx").on(table.riskStatus),
    uniqueIndex("withdrawals_tx_hash_unique").on(table.txHash),
    check("withdrawals_amount_positive_check", sql`${table.amount} > 0`),
    check("withdrawals_fee_non_negative_check", sql`${table.fee} >= 0`),
  ],
);

export const insertDepositSchema = createInsertSchema(deposits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertWithdrawalSchema = createInsertSchema(withdrawals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDeposit = z.infer<typeof insertDepositSchema>;
export type Deposit = typeof deposits.$inferSelect;
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type Withdrawal = typeof withdrawals.$inferSelect;