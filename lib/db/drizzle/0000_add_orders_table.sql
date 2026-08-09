-- Migration: create orders table with Stripe + Gelato integration columns
-- Generated from lib/db/src/schema/orders.ts

DO $$ BEGIN
  CREATE TYPE "public"."order_status" AS ENUM(
    'pending',
    'payment_pending',
    'processing',
    'printing',
    'shipped',
    'delivered',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "orders" (
  "id"                       text PRIMARY KEY NOT NULL,
  "user_email"               text,
  "book_month_key"           text NOT NULL,
  "book_title"               text NOT NULL,
  "page_count"               integer NOT NULL,
  "status"                   "public"."order_status" DEFAULT 'pending' NOT NULL,
  "shipping_name"            text NOT NULL,
  "shipping_line1"           text NOT NULL,
  "shipping_line2"           text,
  "shipping_city"            text NOT NULL,
  "shipping_state"           text NOT NULL,
  "shipping_zip"             text NOT NULL,
  "shipping_country"         text NOT NULL,
  "total_cents"              integer NOT NULL,
  "stripe_session_id"        text UNIQUE,
  "stripe_payment_intent_id" text,
  "gelato_order_id"          text,
  "pdf_url"                  text,
  "pdf_upload_token"         text,
  "tracking_number"          text,
  "estimated_delivery"       text,
  "created_at"               timestamp DEFAULT now() NOT NULL,
  "updated_at"               timestamp DEFAULT now() NOT NULL
);
