import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const intentions = sqliteTable("intentions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(100),
  quranCycle: integer("quran_cycle").notNull().default(1),
  completedQuranKhatms: integer("completed_quran_khatms").notNull().default(0),
  salawatCycle: integer("salawat_cycle").notNull().default(1),
  salawatCurrent: integer("salawat_current").notNull().default(0),
  salawatTarget: integer("salawat_target").notNull().default(14000),
  completedSalawatKhatms: integer("completed_salawat_khatms").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const quranClaims = sqliteTable(
  "quran_claims",
  {
    id: text("id").primaryKey(),
    intentionId: text("intention_id")
      .notNull()
      .references(() => intentions.id, { onDelete: "cascade" }),
    cycle: integer("cycle").notNull(),
    ayahNumber: integer("ayah_number").notNull(),
    sessionId: text("session_id").notNull(),
    status: text("status").notNull(),
    assignedAt: text("assigned_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    expiresAt: integer("expires_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [
    uniqueIndex("quran_claims_active_ayah_unique")
      .on(table.intentionId, table.cycle, table.ayahNumber)
      .where(sql`${table.status} = 'assigned'`),
    uniqueIndex("quran_claims_completed_ayah_unique")
      .on(table.intentionId, table.cycle, table.ayahNumber)
      .where(sql`${table.status} = 'completed'`),
    index("quran_claims_session_idx").on(
      table.sessionId,
      table.intentionId,
      table.cycle,
      table.status,
    ),
    index("quran_claims_expiry_idx").on(table.status, table.expiresAt),
  ],
);

export const quranHistory = sqliteTable(
  "quran_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    intentionId: text("intention_id")
      .notNull()
      .references(() => intentions.id, { onDelete: "cascade" }),
    cycle: integer("cycle").notNull(),
    intentionTitle: text("intention_title").notNull(),
    completedAt: text("completed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("quran_history_cycle_unique").on(table.intentionId, table.cycle),
  ],
);
