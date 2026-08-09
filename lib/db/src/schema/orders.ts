import { pgTable, text, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ─── Table ────────────────────────────────────────────────────────────────────

export const ordersTable = pgTable("orders", {
  /** Client-generated UUID – the mobile app is the source of truth for IDs */
  id: text("id").primaryKey(),

  /** Google email used as the user identifier (no server-side JWT yet) */
  userEmail: text("user_email").notNull(),

  bookMonthKey: text("book_month_key").notNull(),   // YYYY-MM
  bookTitle: text("book_title").notNull(),
  pageCount: integer("page_count").notNull(),

  /** One of: pending | processing | printing | shipped | delivered | cancelled */
  status: text("status").notNull().default("processing"),

  /** Full ShippingAddress object stored as JSONB */
  shippingAddress: jsonb("shipping_address").notNull(),

  totalCents: integer("total_cents").notNull(),

  /** ISO 8601 timestamps stored as text for portability with the mobile client */
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),

  trackingNumber: text("tracking_number"),
  estimatedDelivery: text("estimated_delivery"), // ISO date string (YYYY-MM-DD)
});

// ─── Zod schemas ──────────────────────────────────────────────────────────────

/** Use for validating insert payloads from the API (all required fields present). */
export const insertOrderSchema = createInsertSchema(ordersTable);
export const selectOrderSchema = createSelectSchema(ordersTable);

export type DbOrder   = typeof ordersTable.$inferSelect;
export type InsertDbOrder = typeof ordersTable.$inferInsert;
