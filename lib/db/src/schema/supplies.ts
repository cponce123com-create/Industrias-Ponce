import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const suppliesTable = pgTable("supplies", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Supply = typeof suppliesTable.$inferSelect;
export type NewSupply = typeof suppliesTable.$inferInsert;
