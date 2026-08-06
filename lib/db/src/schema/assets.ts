import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  boolean,
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
import { assetTypeEnum, lifecycleStatusEnum, networkStatusEnum } from "./enums";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    symbol: text("symbol").notNull(),
    name: text("name").notNull(),
    type: assetTypeEnum("type").notNull().default("CRYPTO"),
    status: lifecycleStatusEnum("status").notNull().default("ACTIVE"),
    precision: integer("precision").notNull().default(18),
    displayPrecision: integer("display_precision").notNull().default(8),
    iconUrl: text("icon_url"),
    depositEnabled: boolean("deposit_enabled").notNull().default(true),
    withdrawalEnabled: boolean("withdrawal_enabled").notNull().default(true),
    tradingEnabled: boolean("trading_enabled").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("assets_symbol_unique").on(table.symbol),
    index("assets_status_type_idx").on(table.status, table.type),
    check("assets_precision_range_check", sql`${table.precision} between 0 and 36`),
    check("assets_display_precision_range_check", sql`${table.displayPrecision} between 0 and 36`),
  ],
);

export const networks = pgTable(
  "networks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    code: text("code").notNull(),
    name: text("name").notNull(),
    chainId: text("chain_id"),
    nativeAssetId: uuid("native_asset_id").references(() => assets.id, { onDelete: "set null" }),
    explorerUrl: text("explorer_url"),
    status: networkStatusEnum("status").notNull().default("ACTIVE"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("networks_code_unique").on(table.code),
    index("networks_status_idx").on(table.status),
  ],
);

export const assetNetworks = pgTable(
  "asset_networks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    networkId: uuid("network_id")
      .notNull()
      .references(() => networks.id, { onDelete: "cascade" }),
    contractAddress: text("contract_address"),
    depositEnabled: boolean("deposit_enabled").notNull().default(true),
    withdrawalEnabled: boolean("withdrawal_enabled").notNull().default(true),
    minimumDeposit: numeric("minimum_deposit", { precision: 36, scale: 18 }).notNull().default("0"),
    minimumWithdrawal: numeric("minimum_withdrawal", { precision: 36, scale: 18 }).notNull().default("0"),
    withdrawalFee: numeric("withdrawal_fee", { precision: 36, scale: 18 }).notNull().default("0"),
    requiredConfirmations: integer("required_confirmations").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("asset_networks_asset_network_unique").on(table.assetId, table.networkId),
    index("asset_networks_network_id_idx").on(table.networkId),
    check("asset_networks_minimum_deposit_check", sql`${table.minimumDeposit} >= 0`),
    check("asset_networks_minimum_withdrawal_check", sql`${table.minimumWithdrawal} >= 0`),
    check("asset_networks_withdrawal_fee_check", sql`${table.withdrawalFee} >= 0`),
    check("asset_networks_confirmations_check", sql`${table.requiredConfirmations} >= 0`),
  ],
);

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertNetworkSchema = createInsertSchema(networks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertAssetNetworkSchema = createInsertSchema(assetNetworks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;
export type InsertNetwork = z.infer<typeof insertNetworkSchema>;
export type Network = typeof networks.$inferSelect;
export type InsertAssetNetwork = z.infer<typeof insertAssetNetworkSchema>;
export type AssetNetwork = typeof assetNetworks.$inferSelect;