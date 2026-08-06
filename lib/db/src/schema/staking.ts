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
import { stakingStatusEnum, rewardStatusEnum } from "./enums";
import { assets } from "./assets";
import { users } from "./users";

export const stakingProducts = pgTable(
  "staking_products",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    assetId: uuid("asset_id").notNull().references(() => assets.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    apy: numeric("apy", { precision: 18, scale: 8 }).notNull(),
    minimumAmount: numeric("minimum_amount", { precision: 36, scale: 18 }).notNull(),
    maximumAmount: numeric("maximum_amount", { precision: 36, scale: 18 }),
    durationDays: numeric("duration_days", { precision: 8, scale: 0 }).notNull(),
    status: stakingStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("staking_products_asset_status_idx").on(table.assetId, table.status),
    check("staking_products_apy_non_negative_check", sql`${table.apy} >= 0`),
    check("staking_products_minimum_amount_check", sql`${table.minimumAmount} > 0`),
    check(
      "staking_products_maximum_amount_check",
      sql`${table.maximumAmount} is null or ${table.maximumAmount} >= ${table.minimumAmount}`,
    ),
    check("staking_products_duration_check", sql`${table.durationDays} > 0`),
  ],
);

export const stakingPositions = pgTable(
  "staking_positions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    productId: uuid("product_id").notNull().references(() => stakingProducts.id, { onDelete: "restrict" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 36, scale: 18 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    maturesAt: timestamp("matures_at", { withTimezone: true }).notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    status: stakingStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("staking_positions_user_status_idx").on(table.userId, table.status),
    index("staking_positions_matures_at_idx").on(table.maturesAt),
    check("staking_positions_amount_positive_check", sql`${table.amount} > 0`),
  ],
);

export const stakingRewards = pgTable(
  "staking_rewards",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    positionId: uuid("position_id").notNull().references(() => stakingPositions.id, { onDelete: "restrict" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 36, scale: 18 }).notNull(),
    rewardDate: timestamp("reward_date", { withTimezone: true }).notNull(),
    status: rewardStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("staking_rewards_position_date_unique").on(table.positionId, table.rewardDate),
    index("staking_rewards_user_status_idx").on(table.userId, table.status),
    check("staking_rewards_amount_positive_check", sql`${table.amount} > 0`),
  ],
);

export const insertStakingProductSchema = createInsertSchema(stakingProducts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStakingPositionSchema = createInsertSchema(stakingPositions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStakingRewardSchema = createInsertSchema(stakingRewards).omit({ id: true, createdAt: true });
export type InsertStakingProduct = z.infer<typeof insertStakingProductSchema>;
export type StakingProduct = typeof stakingProducts.$inferSelect;
export type InsertStakingPosition = z.infer<typeof insertStakingPositionSchema>;
export type StakingPosition = typeof stakingPositions.$inferSelect;
export type InsertStakingReward = z.infer<typeof insertStakingRewardSchema>;
export type StakingReward = typeof stakingRewards.$inferSelect;