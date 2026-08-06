import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import {
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { kycDocumentStatusEnum, kycStatusEnum } from "./enums";
import { adminUsers } from "./admin";
import { users } from "./users";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const kycApplications = pgTable(
  "kyc_applications",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    legalName: text("legal_name"),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    country: text("country"),
    documentType: text("document_type"),
    documentReference: text("document_reference"),
    status: kycStatusEnum("status").notNull().default("NOT_STARTED"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewerId: uuid("reviewer_id").references(() => adminUsers.id, { onDelete: "set null" }),
    reviewReason: text("review_reason"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("kyc_applications_user_id_unique").on(table.userId),
    index("kyc_applications_status_created_at_idx").on(table.status, table.createdAt),
  ],
);

export const kycDocuments = pgTable(
  "kyc_documents",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => kycApplications.id, { onDelete: "cascade" }),
    documentType: text("document_type").notNull(),
    storageReference: text("storage_reference").notNull(),
    contentHash: text("content_hash"),
    status: kycDocumentStatusEnum("status").notNull().default("UPLOADED"),
    expiresAt: date("expires_at", { mode: "string" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("kyc_documents_application_id_idx").on(table.applicationId),
    uniqueIndex("kyc_documents_content_hash_unique").on(table.contentHash),
  ],
);

export const kycReviews = pgTable(
  "kyc_reviews",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => kycApplications.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "restrict" }),
    fromStatus: kycStatusEnum("from_status"),
    toStatus: kycStatusEnum("to_status").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("kyc_reviews_application_created_at_idx").on(table.applicationId, table.createdAt)],
);

export const insertKycApplicationSchema = createInsertSchema(kycApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertKycDocumentSchema = createInsertSchema(kycDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertKycReviewSchema = createInsertSchema(kycReviews).omit({ id: true, createdAt: true });

export type InsertKycApplication = z.infer<typeof insertKycApplicationSchema>;
export type KycApplication = typeof kycApplications.$inferSelect;
export type InsertKycDocument = z.infer<typeof insertKycDocumentSchema>;
export type KycDocument = typeof kycDocuments.$inferSelect;
export type InsertKycReview = z.infer<typeof insertKycReviewSchema>;
export type KycReview = typeof kycReviews.$inferSelect;