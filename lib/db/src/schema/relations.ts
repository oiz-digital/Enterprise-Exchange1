import { relations } from "drizzle-orm";
import { adminRoles, adminUsers, permissions, rolePermissions, roles } from "./admin";
import { assetNetworks, assets, networks } from "./assets";
import { auditLogs } from "./audit";
import { deposits, withdrawals } from "./funds";
import { feeRecords, feeRules } from "./fees";
import { kycApplications, kycDocuments, kycReviews } from "./kyc";
import { ledgerAccounts, ledgerEntries, ledgerTransactions } from "./ledger";
import { markets } from "./markets";
import { notifications } from "./notifications";
import { orders, trades } from "./trading";
import { stakingPositions, stakingProducts, stakingRewards } from "./staking";
import { users, userProfiles, userSecurity, devices, userSessions } from "./users";
import { wallets, walletAddresses } from "./wallets";
import { p2pAds, p2pOrders } from "./p2p";
import { referrals, referralRewards } from "./referrals";
import { riskFlags } from "./risk";
import { systemSettings, featureFlags } from "./settings";
import { idempotencyKeys } from "./idempotency";

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles),
  security: one(userSecurity),
  devices: many(devices),
  sessions: many(userSessions),
  kycApplication: one(kycApplications),
  wallets: many(wallets),
  deposits: many(deposits),
  withdrawals: many(withdrawals),
  orders: many(orders),
  tradesAsMaker: many(trades, { relationName: "makerTrades" }),
  tradesAsTaker: many(trades, { relationName: "takerTrades" }),
  notifications: many(notifications),
  riskFlags: many(riskFlags),
  referralsAsReferrer: many(referrals, { relationName: "referrer" }),
  referralsAsReferred: many(referrals, { relationName: "referred" }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
}));
export const userSecurityRelations = relations(userSecurity, ({ one }) => ({
  user: one(users, { fields: [userSecurity.userId], references: [users.id] }),
}));
export const devicesRelations = relations(devices, ({ one, many }) => ({
  user: one(users, { fields: [devices.userId], references: [users.id] }),
  sessions: many(userSessions),
}));
export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, { fields: [userSessions.userId], references: [users.id] }),
  device: one(devices, { fields: [userSessions.deviceId], references: [devices.id] }),
}));

export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  roles: many(adminRoles),
  assignedRoles: many(adminRoles, { relationName: "assignedBy" }),
  kycReviews: many(kycReviews),
  auditLogs: many(auditLogs),
  requestedWithdrawals: many(withdrawals, { relationName: "requestingAdmin" }),
  reviewedWithdrawals: many(withdrawals, { relationName: "reviewingAdmin" }),
  updatedSettings: many(systemSettings, { relationName: "settingsUpdatedBy" }),
  updatedFeatureFlags: many(featureFlags, { relationName: "featureFlagsUpdatedBy" }),
}));
export const rolesRelations = relations(roles, ({ many }) => ({
  admins: many(adminRoles),
  permissions: many(rolePermissions),
}));
export const permissionsRelations = relations(permissions, ({ many }) => ({ roles: many(rolePermissions) }));
export const adminRolesRelations = relations(adminRoles, ({ one }) => ({
  admin: one(adminUsers, { fields: [adminRoles.adminId], references: [adminUsers.id] }),
  role: one(roles, { fields: [adminRoles.roleId], references: [roles.id] }),
  assignedBy: one(adminUsers, { fields: [adminRoles.assignedBy], references: [adminUsers.id], relationName: "assignedBy" }),
}));
export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}));

export const kycApplicationsRelations = relations(kycApplications, ({ one, many }) => ({
  user: one(users, { fields: [kycApplications.userId], references: [users.id] }),
  reviewer: one(adminUsers, { fields: [kycApplications.reviewerId], references: [adminUsers.id] }),
  documents: many(kycDocuments),
  reviews: many(kycReviews),
}));
export const kycDocumentsRelations = relations(kycDocuments, ({ one }) => ({
  application: one(kycApplications, { fields: [kycDocuments.applicationId], references: [kycApplications.id] }),
}));
export const kycReviewsRelations = relations(kycReviews, ({ one }) => ({
  application: one(kycApplications, { fields: [kycReviews.applicationId], references: [kycApplications.id] }),
  reviewer: one(adminUsers, { fields: [kycReviews.reviewerId], references: [adminUsers.id] }),
}));

export const assetsRelations = relations(assets, ({ many }) => ({
  networks: many(assetNetworks),
  marketsAsBase: many(markets, { relationName: "baseAsset" }),
  marketsAsQuote: many(markets, { relationName: "quoteAsset" }),
  wallets: many(wallets),
  ledgerAccounts: many(ledgerAccounts),
  ledgerEntries: many(ledgerEntries),
}));
export const networksRelations = relations(networks, ({ one, many }) => ({
  nativeAsset: one(assets, {
    fields: [networks.nativeAssetId],
    references: [assets.id],
    relationName: "nativeAsset",
  }),
  assets: many(assetNetworks),
  walletAddresses: many(walletAddresses),
}));
export const assetNetworksRelations = relations(assetNetworks, ({ one }) => ({
  asset: one(assets, { fields: [assetNetworks.assetId], references: [assets.id] }),
  network: one(networks, { fields: [assetNetworks.networkId], references: [networks.id] }),
}));
export const marketsRelations = relations(markets, ({ one, many }) => ({
  baseAsset: one(assets, { fields: [markets.baseAssetId], references: [assets.id], relationName: "baseAsset" }),
  quoteAsset: one(assets, { fields: [markets.quoteAssetId], references: [assets.id], relationName: "quoteAsset" }),
  orders: many(orders),
  trades: many(trades),
  feeRules: many(feeRules),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
  asset: one(assets, { fields: [wallets.assetId], references: [assets.id] }),
  addresses: many(walletAddresses),
}));
export const walletAddressesRelations = relations(walletAddresses, ({ one }) => ({
  wallet: one(wallets, { fields: [walletAddresses.walletId], references: [wallets.id] }),
  network: one(networks, { fields: [walletAddresses.networkId], references: [networks.id] }),
}));
export const ledgerAccountsRelations = relations(ledgerAccounts, ({ one, many }) => ({
  user: one(users, { fields: [ledgerAccounts.userId], references: [users.id] }),
  asset: one(assets, { fields: [ledgerAccounts.assetId], references: [assets.id] }),
  entries: many(ledgerEntries),
}));
export const ledgerTransactionsRelations = relations(ledgerTransactions, ({ many }) => ({
  entries: many(ledgerEntries),
}));
export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  transaction: one(ledgerTransactions, { fields: [ledgerEntries.transactionId], references: [ledgerTransactions.id] }),
  account: one(ledgerAccounts, { fields: [ledgerEntries.accountId], references: [ledgerAccounts.id] }),
  asset: one(assets, { fields: [ledgerEntries.assetId], references: [assets.id] }),
}));

export const depositsRelations = relations(deposits, ({ one }) => ({
  user: one(users, { fields: [deposits.userId], references: [users.id] }),
  asset: one(assets, { fields: [deposits.assetId], references: [assets.id] }),
  network: one(networks, { fields: [deposits.networkId], references: [networks.id] }),
}));
export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  user: one(users, { fields: [withdrawals.userId], references: [users.id] }),
  asset: one(assets, { fields: [withdrawals.assetId], references: [assets.id] }),
  network: one(networks, { fields: [withdrawals.networkId], references: [networks.id] }),
  requestingAdmin: one(adminUsers, { fields: [withdrawals.requestedByAdminId], references: [adminUsers.id], relationName: "requestingAdmin" }),
  reviewingAdmin: one(adminUsers, { fields: [withdrawals.reviewedByAdminId], references: [adminUsers.id], relationName: "reviewingAdmin" }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  market: one(markets, { fields: [orders.marketId], references: [markets.id] }),
  makerTrades: many(trades, { relationName: "makerOrder" }),
  takerTrades: many(trades, { relationName: "takerOrder" }),
}));
export const tradesRelations = relations(trades, ({ one }) => ({
  market: one(markets, { fields: [trades.marketId], references: [markets.id] }),
  makerOrder: one(orders, { fields: [trades.makerOrderId], references: [orders.id], relationName: "makerOrder" }),
  takerOrder: one(orders, { fields: [trades.takerOrderId], references: [orders.id], relationName: "takerOrder" }),
  makerUser: one(users, { fields: [trades.makerUserId], references: [users.id], relationName: "makerTrades" }),
  takerUser: one(users, { fields: [trades.takerUserId], references: [users.id], relationName: "takerTrades" }),
}));

export const feeRulesRelations = relations(feeRules, ({ one, many }) => ({
  market: one(markets, {
    fields: [feeRules.marketId],
    references: [markets.id],
    relationName: "marketFeeRules",
  }),
  asset: one(assets, {
    fields: [feeRules.assetId],
    references: [assets.id],
    relationName: "assetFeeRules",
  }),
  records: many(feeRecords),
}));
export const feeRecordsRelations = relations(feeRecords, ({ one }) => ({
  user: one(users, { fields: [feeRecords.userId], references: [users.id] }),
  asset: one(assets, { fields: [feeRecords.assetId], references: [assets.id] }),
  rule: one(feeRules, { fields: [feeRecords.ruleId], references: [feeRules.id] }),
}));

export const stakingProductsRelations = relations(stakingProducts, ({ one, many }) => ({
  asset: one(assets, { fields: [stakingProducts.assetId], references: [assets.id] }),
  positions: many(stakingPositions),
}));
export const stakingPositionsRelations = relations(stakingPositions, ({ one, many }) => ({
  product: one(stakingProducts, { fields: [stakingPositions.productId], references: [stakingProducts.id] }),
  user: one(users, { fields: [stakingPositions.userId], references: [users.id] }),
  rewards: many(stakingRewards),
}));
export const stakingRewardsRelations = relations(stakingRewards, ({ one }) => ({
  position: one(stakingPositions, { fields: [stakingRewards.positionId], references: [stakingPositions.id] }),
  user: one(users, { fields: [stakingRewards.userId], references: [users.id] }),
}));

export const p2pAdsRelations = relations(p2pAds, ({ one, many }) => ({
  user: one(users, { fields: [p2pAds.userId], references: [users.id] }),
  asset: one(assets, { fields: [p2pAds.assetId], references: [assets.id] }),
  orders: many(p2pOrders),
}));
export const p2pOrdersRelations = relations(p2pOrders, ({ one }) => ({
  ad: one(p2pAds, { fields: [p2pOrders.adId], references: [p2pAds.id] }),
  buyer: one(users, { fields: [p2pOrders.buyerId], references: [users.id], relationName: "p2pBuyer" }),
  seller: one(users, { fields: [p2pOrders.sellerId], references: [users.id], relationName: "p2pSeller" }),
  asset: one(assets, { fields: [p2pOrders.assetId], references: [assets.id] }),
}));

export const referralsRelations = relations(referrals, ({ one, many }) => ({
  referrer: one(users, { fields: [referrals.referrerId], references: [users.id], relationName: "referrer" }),
  referredUser: one(users, {
    fields: [referrals.referredUserId],
    references: [users.id],
    relationName: "referred",
  }),
  rewards: many(referralRewards),
}));
export const referralRewardsRelations = relations(referralRewards, ({ one }) => ({
  referral: one(referrals, { fields: [referralRewards.referralId], references: [referrals.id] }),
  user: one(users, { fields: [referralRewards.userId], references: [users.id] }),
  asset: one(assets, { fields: [referralRewards.assetId], references: [assets.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
export const riskFlagsRelations = relations(riskFlags, ({ one }) => ({
  user: one(users, { fields: [riskFlags.userId], references: [users.id] }),
  resolver: one(adminUsers, { fields: [riskFlags.resolvedBy], references: [adminUsers.id] }),
}));
export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updatedByAdmin: one(adminUsers, {
    fields: [systemSettings.updatedBy],
    references: [adminUsers.id],
    relationName: "settingsUpdatedBy",
  }),
}));
export const featureFlagsRelations = relations(featureFlags, ({ one }) => ({
  updatedByAdmin: one(adminUsers, {
    fields: [featureFlags.updatedBy],
    references: [adminUsers.id],
    relationName: "featureFlagsUpdatedBy",
  }),
}));
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  admin: one(adminUsers, { fields: [auditLogs.adminId], references: [adminUsers.id] }),
}));
export const idempotencyKeysRelations = relations(idempotencyKeys, ({ one }) => ({
  user: one(users, { fields: [idempotencyKeys.actorUserId], references: [users.id] }),
  admin: one(adminUsers, { fields: [idempotencyKeys.actorAdminId], references: [adminUsers.id] }),
}));