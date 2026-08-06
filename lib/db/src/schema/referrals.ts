import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
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
import { referralStatusEnum, rewardStatusEnum } from "./enums";
import { assets } from "./assets";
import { users } from "./users";

export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    referrerId: uuid("referrer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    referredUserId: uuid("referred_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    referralCode: text("referral_code").notNull(),
    status: referralStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("referrals_referred_user_unique").on(table.referredUserId),
    uniqueIndex("referrals_code_user_unique").on(table.referrerId, table.referralCode),
    index("referrals_referrer_status_idx").on(table.referrerId, table.status),
  ],
);

export const referralRewards = pgTable(
  "referral_rewards",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    referralId: uuid("referral_id").notNull().references(() => referrals.id, { onDelete: "restrict" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    assetId: uuid("asset_id").notNull().references(() => assets.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 36, scale: 18 }).notNull(),
    referenceType: text("reference_type").notNull(),
    referenceId: uuid("reference_id").notNull(),
    status: rewardStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("referral_rewards_reference_unique").on(table.referenceType, table.referenceId),
    index("referral_rewards_user_status_idx").on(table.userId, table.status),
    check("referral_rewards_amount_positive_check", sql`${table.amount} > 0`),
  ],
);

export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReferralRewardSchema = createInsertSchema(referralRewards).omit({ id: true, createdAt: true });
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferralReward = z.infer<typeof insertReferralRewardSchema>;
export type ReferralReward = typeof referralRewards.$inferSelect;