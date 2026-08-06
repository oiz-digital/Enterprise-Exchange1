import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const otpVerifications = pgTable(
  "otp_verifications",
  {
    id: serial("id").primaryKey(),
    mobile: text("mobile").notNull(),
    // 'register' | 'login' | 'pin_set' | 'pin_change'
    purpose: text("purpose").notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("otp_mobile_purpose_idx").on(table.mobile, table.purpose),
    index("otp_expires_idx").on(table.expiresAt),
  ],
);

export type OtpVerification = typeof otpVerifications.$inferSelect;
