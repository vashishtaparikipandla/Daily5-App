import { randomUUID } from "crypto";
import path from "path";
import { writeFile } from "fs/promises";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { eq, desc, and, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db/schema";
import { stripe, TOTAL_CENTS, BOOK_PRICE_CENTS, SHIPPING_CENTS } from "../lib/stripe.js";
import { uploadPdfMiddleware, UPLOADS_DIR } from "../lib/uploads.js";
import { submitPrintOrder } from "../lib/gelato.js";
import { getCanonicalBaseUrl } from "../lib/canonical-url.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ─── Internal token middleware ────────────────────────────────────────────────

const INTERNAL_TOKEN = process.env["INTERNAL_API_TOKEN"] ?? "";

function requireInternalToken(req: Request, res: Response, next: NextFunction) {
  if (!INTERNAL_TOKEN) {
    res.status(501).json({ error: "INTERNAL_API_TOKEN not configured" });
    return;
  }
  const provided = req.headers["x-internal-token"] as string | undefined;
  if (!provided || provided !== INTERNAL_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const CreateCheckoutSchema = z.object({
  bookMonthKey: z.string().min(1),
  bookTitle: z.string().min(1),
  pageCount: z.number().int().positive(),
  shippingName: z.string().min(1),
  shippingLine1: z.string().min(1),
  shippingLine2: z.string().optional(),
  shippingCity: z.string().min(1),
  shippingState: z.string().min(1),
  shippingZip: z.string().min(1),
  shippingCountry: z.string().min(2),
});

// ─── POST /api/orders/checkout-session ───────────────────────────────────────

router.post("/checkout-session", async (req: Request, res: Response) => {
  if (!stripe) {
    res.status(503).json({ error: "Payment service not configured. Set STRIPE_SECRET_KEY." });
    return;
  }

  const parse = CreateCheckoutSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid request", issues: parse.error.issues });
    return;
  }

  const data = parse.data;
  const orderId = randomUUID();
  // Per-order upload capability: scopes PDF upload to the checkout initiator
  // without requiring user authentication.
  const pdfUploadToken = randomUUID();
  const baseUrl = getCanonicalBaseUrl();

  try {
    await db.insert(ordersTable).values({
      id: orderId,
      bookMonthKey: data.bookMonthKey,
      bookTitle: data.bookTitle,
      pageCount: data.pageCount,
      status: "payment_pending",
      shippingName: data.shippingName,
      shippingLine1: data.shippingLine1,
      shippingLine2: data.shippingLine2 ?? null,
      shippingCity: data.shippingCity,
      shippingState: data.shippingState,
      shippingZip: data.shippingZip,
      shippingCountry: data.shippingCountry,
      totalCents: TOTAL_CENTS,
      pdfUploadToken,
      estimatedDelivery: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${data.bookTitle} — Daily 5 Photo Book`,
              description: `${data.pageCount}-page softcover photo book`,
            },
            unit_amount: BOOK_PRICE_CENTS,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Shipping" },
            unit_amount: SHIPPING_CENTS,
          },
          quantity: 1,
        },
      ],
      metadata: { orderId, bookMonthKey: data.bookMonthKey, bookTitle: data.bookTitle },
      success_url: `${baseUrl}/api/orders/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/api/orders/payment-cancel`,
    });

    await db
      .update(ordersTable)
      .set({ stripeSessionId: session.id, updatedAt: new Date() })
      .where(eq(ordersTable.id, orderId));

    logger.info({ orderId, sessionId: session.id }, "Checkout session created");
    // pdfUploadToken is the upload credential — return it to the client.
    res.json({ url: session.url, sessionId: session.id, orderId, pdfUploadToken });
  } catch (err) {
    logger.error({ err }, "Failed to create checkout session");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// ─── POST /api/orders/:id/pdf — authenticated, state-gated PDF upload ─────────
//
// Authorization:
//   • Requires X-PDF-Upload-Token header matching the per-order capability token.
// State machine:
//   • Rejected once a Gelato job is confirmed (immutable after submission).
//   • Rejected for terminal statuses (shipped, delivered, cancelled).
//   • Triggers Gelato immediately when payment is already confirmed (processing).

router.post(
  "/:id/pdf",
  uploadPdfMiddleware.single("pdf"),
  async (req: Request & { file?: Express.Multer.File }, res: Response) => {
    const id = String(req.params["id"]);
    // Strict UUID validation before any DB lookup or filesystem use.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      res.status(400).json({ error: "Invalid order ID format" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No PDF file provided" });
      return;
    }

    const [existing] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    // ── Authorization ────────────────────────────────────────────────────────
    const providedToken = req.headers["x-pdf-upload-token"] as string | undefined;
    if (!existing.pdfUploadToken || !providedToken || providedToken !== existing.pdfUploadToken) {
      res.status(401).json({ error: "Invalid or missing PDF upload token" });
      return;
    }

    // ── State guard ──────────────────────────────────────────────────────────
    const terminalStatuses = ["shipped", "delivered", "cancelled"] as const;
    if (terminalStatuses.some(s => s === existing.status)) {
      res.status(409).json({ error: `Cannot upload PDF: order status is '${existing.status}'` });
      return;
    }
    // Gelato has already accepted the job — print file is immutable.
    if (existing.gelatoOrderId && !existing.gelatoOrderId.startsWith("claiming-")) {
      res.status(409).json({ error: "Print job already submitted — PDF cannot be replaced" });
      return;
    }

    try {
      const filename = `${id}.pdf`;
      await writeFile(path.join(UPLOADS_DIR, filename), req.file.buffer);

      const pdfUrl = `${getCanonicalBaseUrl()}/api/pdfs/${filename}`;

      await db
        .update(ordersTable)
        .set({ pdfUrl, updatedAt: new Date() })
        .where(eq(ordersTable.id, id));

      logger.info({ orderId: id, pdfUrl }, "PDF uploaded and linked to order");

      // ── Trigger Gelato if payment already confirmed ────────────────────────
      // Covers the race: payment webhook fired before PDF was uploaded, found
      // no pdfUrl, and skipped Gelato. Now both are present — submit.
      if (existing.status === "processing") {
        const updatedOrder = { ...existing, pdfUrl };
        claimAndSubmitToGelato(updatedOrder).catch(err =>
          logger.error({ err, orderId: id }, "Gelato trigger from PDF upload failed"),
        );
      }

      res.json({ pdfUrl });
    } catch (err) {
      logger.error({ err, orderId: id }, "Failed to store uploaded PDF");
      res.status(500).json({ error: "Failed to store PDF" });
    }
  },
);

// ─── Gelato claim-and-submit ──────────────────────────────────────────────────
//
// Atomic claim prevents duplicate print jobs from concurrent calls or replays.
// The Gelato API-level Idempotency-Key ensures retries after a network failure
// return the existing order rather than creating a second physical print job.
//
// Exported so the periodic retry worker and the webhook can share this logic.

export async function claimAndSubmitToGelato(order: typeof ordersTable.$inferSelect) {
  if (!order.pdfUrl) return;

  const claimSentinel = `claiming-${Date.now()}`;

  const claimed = await db
    .update(ordersTable)
    .set({ gelatoOrderId: claimSentinel, updatedAt: new Date() })
    .where(and(eq(ordersTable.id, order.id), isNull(ordersTable.gelatoOrderId)))
    .returning({ id: ordersTable.id });

  if (claimed.length === 0) {
    logger.info({ orderId: order.id }, "Gelato submission already claimed — skipping");
    return;
  }

  try {
    const gelatoOrder = await submitPrintOrder(
      order.id,
      order.pdfUrl,
      order.shippingName,
      order.shippingLine1,
      order.shippingLine2 ?? undefined,
      order.shippingCity,
      order.shippingState,
      order.shippingZip,
      order.shippingCountry,
    );

    if (gelatoOrder) {
      // Constrain to 'processing' — a concurrent Gelato fulfillment webhook
      // may have already advanced the status to 'printing'/'shipped'/etc.
      // Avoid regressing a forward status with this write.
      await db
        .update(ordersTable)
        .set({ status: "printing", gelatoOrderId: gelatoOrder.id, updatedAt: new Date() })
        .where(and(eq(ordersTable.id, order.id), eq(ordersTable.status, "processing")));

      // Always persist the Gelato order ID even if status didn't move
      await db
        .update(ordersTable)
        .set({ gelatoOrderId: gelatoOrder.id, updatedAt: new Date() })
        .where(and(eq(ordersTable.id, order.id), eq(ordersTable.gelatoOrderId, claimSentinel)));

      logger.info({ orderId: order.id, gelatoOrderId: gelatoOrder.id }, "Print order submitted");
    } else {
      // Gelato not configured — release claim so retry worker can try again later
      await db
        .update(ordersTable)
        .set({ gelatoOrderId: null, updatedAt: new Date() })
        .where(eq(ordersTable.id, order.id));
    }
  } catch (err) {
    // Release claim on failure so next retry attempt can re-claim.
    // Gelato's Idempotency-Key means if Gelato had already accepted the request,
    // the retry returns the same order — no duplicate print job.
    await db
      .update(ordersTable)
      .set({ gelatoOrderId: null, updatedAt: new Date() })
      .where(eq(ordersTable.id, order.id));
    logger.error({ err, orderId: order.id }, "Gelato submission failed — claim released for retry");
    throw err;
  }
}

// ─── Periodic retry worker ────────────────────────────────────────────────────
// Finds paid orders with a PDF that have not yet been submitted to Gelato
// and retries. Runs every 5 minutes so transient Gelato failures self-heal
// without operator intervention.

export function startGelatoRetryWorker() {
  const INTERVAL_MS = 5 * 60 * 1000;

  const run = async () => {
    try {
      const pending = await db
        .select()
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.status, "processing"),
            isNull(ordersTable.gelatoOrderId),
          ),
        );

      // Only retry orders that already have a PDF (pdfUrl set)
      const retryable = pending.filter(o => o.pdfUrl != null);

      if (retryable.length > 0) {
        logger.info({ count: retryable.length }, "Gelato retry worker: submitting pending orders");
        await Promise.allSettled(retryable.map(o => claimAndSubmitToGelato(o)));
      }
    } catch (err) {
      logger.error({ err }, "Gelato retry worker error");
    }
  };

  // Run once at startup (catches any orders missed during a server restart),
  // then on a 5-minute interval.
  setTimeout(run, 30_000); // 30s after startup to avoid boot noise
  return setInterval(run, INTERVAL_MS);
}

// ─── GET /api/orders/payment-success ─────────────────────────────────────────

router.get("/payment-success", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Payment Successful</title>
  <style>
    body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;
         min-height:100vh;margin:0;background:#fafafa}
    .card{text-align:center;padding:40px;max-width:360px}
    .icon{font-size:56px;margin-bottom:16px}
    h1{margin:0 0 8px;font-size:24px;color:#111}p{color:#555;margin:0 0 24px}
    .note{font-size:13px;color:#888}
  </style>
</head>
<body><div class="card">
  <div class="icon">✅</div>
  <h1>Payment successful!</h1>
  <p>Your book is heading to the printer.</p>
  <p class="note">Close this window and return to the Daily 5 app.</p>
</div></body></html>`);
});

// ─── GET /api/orders/payment-cancel ──────────────────────────────────────────

router.get("/payment-cancel", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Payment Cancelled</title>
  <style>
    body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;
         min-height:100vh;margin:0;background:#fafafa}
    .card{text-align:center;padding:40px;max-width:360px}
    .icon{font-size:56px;margin-bottom:16px}
    h1{margin:0 0 8px;font-size:24px;color:#111}p{color:#555;margin:0}
  </style>
</head>
<body><div class="card">
  <div class="icon">↩️</div>
  <h1>Payment cancelled</h1>
  <p>No charge was made. Close this window to return to the Daily 5 app.</p>
</div></body></html>`);
});

// ─── GET /api/orders — internal/admin only ───────────────────────────────────

router.get("/", requireInternalToken, async (_req: Request, res: Response) => {
  try {
    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
    res.json({ orders });
  } catch (err) {
    logger.error({ err }, "Failed to list orders");
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// ─── GET /api/orders/:id — public status (no PII) ────────────────────────────

router.get("/:id", async (req: Request, res: Response) => {
  const id = String(req.params["id"]);
  // Strict UUID validation — prevents non-UUID values from reaching the DB.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    res.status(400).json({ error: "Invalid order ID format" });
    return;
  }
  try {
    const [order] = await db
      .select({
        id: ordersTable.id,
        bookMonthKey: ordersTable.bookMonthKey,
        bookTitle: ordersTable.bookTitle,
        pageCount: ordersTable.pageCount,
        status: ordersTable.status,
        totalCents: ordersTable.totalCents,
        trackingNumber: ordersTable.trackingNumber,
        estimatedDelivery: ordersTable.estimatedDelivery,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
      })
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json({ order });
  } catch (err) {
    logger.error({ err, id }, "Failed to get order");
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

export default router;
