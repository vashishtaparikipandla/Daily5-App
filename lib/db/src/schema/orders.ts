import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

// Enum defined before the table so the column type resolves correctly.
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "payment_pending",
  "processing",
  "printing",
  "shipped",
  "delivered",
  "cancelled",
]);

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),

  /**
   * Authenticated user email — set by the server from a verified Google token.
   * Null for orders created before user-auth was introduced (legacy rows).
   */
  userEmail: text("user_email"),

  bookMonthKey: text("book_month_key").notNull(),
  bookTitle: text("book_title").notNull(),
  pageCount: integer("page_count").notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),

  // Flat shipping fields (prefer over JSONB for query-ability and typing)
  shippingName: text("shipping_name").notNull(),
  shippingLine1: text("shipping_line1").notNull(),
  shippingLine2: text("shipping_line2"),
  shippingCity: text("shipping_city").notNull(),
  shippingState: text("shipping_state").notNull(),
  shippingZip: text("shipping_zip").notNull(),
  shippingCountry: text("shipping_country").notNull(),

  totalCents: integer("total_cents").notNull(),

  // Stripe integration
  stripeSessionId: text("stripe_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),

  // Gelato print integration
  gelatoOrderId: text("gelato_order_id"),
  pdfUrl: text("pdf_url"),

  /**
   * One-time upload capability token returned to the client at checkout.
   * The PDF upload endpoint requires this header: X-PDF-Upload-Token.
   * Scopes the upload right to the order owner without requiring user auth.
   * NULL on orders created before this column was added (legacy rows).
   */
  pdfUploadToken: text("pdf_upload_token"),

  trackingNumber: text("tracking_number"),
  estimatedDelivery: text("estimated_delivery"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Order = typeof ordersTable.$inferSelect;
export type NewOrder = typeof ordersTable.$inferInsert;

// Legacy aliases kept for backward compatibility
export type DbOrder = Order;
export type InsertDbOrder = NewOrder;
