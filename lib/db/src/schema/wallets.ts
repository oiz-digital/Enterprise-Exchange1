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
import { lifecycleStatusEnum } from "./enums";
import { assets } from "./assets";
import { networks } from "./assets";
import { users } from "./users";
import { z } from "zod/v4";

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
    available: numeric("available", { precision: 36, scale: 18 }).notNull().default("0"),
    locked: numeric("locked", { precision: 36, scale: 18 }).notNull().default("0"),
    status: lifecycleStatusEnum("status").notNull().default("ACTIVE"),
    lastReconciledAt: timestamp("last_reconciled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("wallets_user_asset_unique").on(table.userId, table.assetId),
    index("wallets_asset_status_idx").on(table.assetId, table.status),
    check("wallets_available_non_negative_check", sql`${table.available} >= 0`),
    check("wallets_locked_non_negative_check", sql`${table.locked} >= 0`),
  ],
);

export const walletAddresses = pgTable(
  "wallet_addresses",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    networkId: uuid("network_id")
      .notNull()
      .references(() => networks.id, { onDelete: "restrict" }),
    address: text("address").notNull(),
    memo: text("memo"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("wallet_addresses_network_address_unique").on(table.networkId, table.address, table.memo),
    index("wallet_addresses_wallet_id_idx").on(table.walletId),
  ],
);

export const insertWalletSchema = createInsertSchema(wallets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWalletAddressSchema = createInsertSchema(walletAddresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;
export type InsertWalletAddress = z.infer<typeof insertWalletAddressSchema>;
export type WalletAddress = typeof walletAddresses.$inferSelect;