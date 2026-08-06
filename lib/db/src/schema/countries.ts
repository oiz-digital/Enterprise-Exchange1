import {
  boolean,
  index,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const countries = pgTable(
  "countries",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull(),       // ISO 3166-1 alpha-2 e.g. "US"
    dialCode: text("dial_code").notNull(), // e.g. "+1"
    flagEmoji: text("flag_emoji"),       // e.g. "🇺🇸"
    isActive: boolean("is_active").notNull().default(true),
    isRegistrationAllowed: boolean("is_registration_allowed").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("countries_code_unique").on(table.code),
    index("countries_is_active_idx").on(table.isActive),
  ],
);

export type Country = typeof countries.$inferSelect;
export type InsertCountry = typeof countries.$inferInsert;
