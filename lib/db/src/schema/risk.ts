import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { riskFlagStatusEnum, riskSeverityEnum } from "./enums";
import { adminUsers } from "./admin";
import { users } from "./users";

export const riskFlags = pgTable(
  "risk_flags",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    severity: riskSeverityEnum("severity").notNull(),
    code: text("code").notNull(),
    description: text("description"),
    status: riskFlagStatusEnum("status").notNull().default("OPEN"),
    source: text("source").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    resolvedBy: uuid("resolved_by").references(() => adminUsers.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("risk_flags_user_status_idx").on(table.userId, table.status),
    index("risk_flags_severity_status_idx").on(table.severity, table.status),
    index("risk_flags_code_created_at_idx").on(table.code, table.createdAt),
  ],
);

export const insertRiskFlagSchema = createInsertSchema(riskFlags).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRiskFlag = z.infer<typeof insertRiskFlagSchema>;
export type RiskFlag = typeof riskFlags.$inferSelect;