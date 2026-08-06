import { pgEnum } from "drizzle-orm/pg-core";

export const userStatusEnum = pgEnum("user_status", [
  "ACTIVE",
  "SUSPENDED",
  "RESTRICTED",
  "CLOSED",
]);

export const adminStatusEnum = pgEnum("admin_status", [
  "ACTIVE",
  "DISABLED",
  "LOCKED",
]);

export const roleCodeEnum = pgEnum("role_code", [
  "SUPER_ADMIN",
  "ADMIN",
  "COMPLIANCE",
  "FINANCE",
  "SUPPORT",
  "OPERATIONS",
  "READ_ONLY",
]);

export const kycStatusEnum = pgEnum("kyc_status", [
  "NOT_STARTED",
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "RESUBMISSION_REQUIRED",
]);

export const kycDocumentStatusEnum = pgEnum("kyc_document_status", [
  "UPLOADED",
  "VERIFIED",
  "REJECTED",
  "EXPIRED",
]);

export const assetTypeEnum = pgEnum("asset_type", [
  "CRYPTO",
  "FIAT",
  "STABLECOIN",
  "UTILITY",
]);

export const lifecycleStatusEnum = pgEnum("lifecycle_status", [
  "ACTIVE",
  "INACTIVE",
  "DISABLED",
]);

export const networkStatusEnum = pgEnum("network_status", [
  "ACTIVE",
  "MAINTENANCE",
  "DISABLED",
]);

export const marketStatusEnum = pgEnum("market_status", [
  "PRE_TRADING",
  "TRADING",
  "HALTED",
  "DISABLED",
]);

export const ledgerAccountTypeEnum = pgEnum("ledger_account_type", [
  "USER_AVAILABLE",
  "USER_LOCKED",
  "EXCHANGE_CLEARING",
  "WITHDRAWAL_CLEARING",
  "FEE_REVENUE",
  "SYSTEM_ACCOUNT",
]);

export const ledgerTransactionTypeEnum = pgEnum("ledger_transaction_type", [
  "DEPOSIT",
  "WITHDRAWAL",
  "TRADE",
  "FEE",
  "STAKING_REWARD",
  "REFERRAL_REWARD",
  "ADJUSTMENT",
  "REVERSAL",
]);

export const depositStatusEnum = pgEnum("deposit_status", [
  "DETECTED",
  "CONFIRMING",
  "CONFIRMED",
  "CREDITED",
  "FAILED",
  "REVIEW",
]);

export const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "REQUESTED",
  "RISK_REVIEW",
  "PENDING_APPROVAL",
  "APPROVED",
  "PROCESSING",
  "BROADCASTED",
  "COMPLETED",
  "REJECTED",
  "FAILED",
  "CANCELLED",
]);

export const withdrawalRiskStatusEnum = pgEnum("withdrawal_risk_status", [
  "PENDING",
  "CLEAR",
  "REVIEW",
  "BLOCKED",
]);

export const orderSideEnum = pgEnum("order_side", ["BUY", "SELL"]);
export const orderTypeEnum = pgEnum("order_type", ["MARKET", "LIMIT"]);
export const orderStatusEnum = pgEnum("order_status", [
  "NEW",
  "PARTIALLY_FILLED",
  "FILLED",
  "CANCELLED",
  "REJECTED",
]);

export const stakingStatusEnum = pgEnum("staking_status", [
  "ACTIVE",
  "PAUSED",
  "CLOSED",
]);

export const p2pAdStatusEnum = pgEnum("p2p_ad_status", [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "CLOSED",
]);

export const p2pOrderStatusEnum = pgEnum("p2p_order_status", [
  "CREATED",
  "PAYMENT_PENDING",
  "PAID",
  "RELEASED",
  "DISPUTED",
  "CANCELLED",
  "COMPLETED",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "SECURITY",
  "DEPOSIT",
  "WITHDRAWAL",
  "ORDER",
  "TRADE",
  "KYC",
  "SYSTEM",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "IN_APP",
  "EMAIL",
  "SMS",
  "WHATSAPP",
  "PUSH",
]);

export const riskSeverityEnum = pgEnum("risk_severity", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const riskFlagStatusEnum = pgEnum("risk_flag_status", [
  "OPEN",
  "REVIEWING",
  "RESOLVED",
  "DISMISSED",
]);

export const referralStatusEnum = pgEnum("referral_status", [
  "PENDING",
  "ACTIVE",
  "CLOSED",
]);

export const rewardStatusEnum = pgEnum("reward_status", [
  "PENDING",
  "CREDITED",
  "REVERSED",
]);