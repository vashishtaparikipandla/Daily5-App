CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"book_month_key" text NOT NULL,
	"book_title" text NOT NULL,
	"page_count" integer NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"shipping_address" jsonb NOT NULL,
	"total_cents" integer NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"tracking_number" text,
	"estimated_delivery" text
);
