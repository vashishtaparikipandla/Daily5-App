import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db/schema";
import { stripe, STRIPE_WEBHOOK_SECRET } from "../lib/stripe.js";
import { claimAndSubmitToGelato } from "./orders.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ─── Status ordering for monotonic transition enforcement ─────────────────────
// Webhook events may arrive out of order or be replayed. We only allow
// forward transitions to prevent regressions (e.g. a stale Gelato event
// can't move a shipped order back to printing).

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  payment_pending: 1,
  processing: 2,
  printing: 3,
  shipped: 4,
  delivered: 5,
  cancelled: 6,
};

// ─── POST /api/webhooks/stripe ────────────────────────────────────────────────
// DB transition completes BEFORE returning 200 so Stripe retries on DB failure.
// Gelato submission fires asynchronously after the ack.

router.post("/stripe", async (req: Request, res: Response) => {
  if (!stripe) {
    res.status(503).json({ error: "Stripe not configured" });
    return;
  }

  const sig = req.headers["stripe-signature"] as string | undefined;

  let event: Stripe.Event;
  try {
    if (STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, STRIPE_WEBHOOK_SECRET);
    } else if (process.env["NODE_ENV"] !== "production") {
      logger.warn("STRIPE_WEBHOOK_SECRET not set — accepting unverified event (dev only)");
      event = JSON.parse((req.body as Buffer).toString()) as Stripe.Event;
    } else {
      logger.error("Stripe webhook rejected: STRIPE_WEBHOOK_SECRET required in production");
      res.status(400).json({ error: "Webhook signature verification required in production" });
      return;
    }
  } catch (err) {
    logger.error({ err }, "Webhook signature verification failed");
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  logger.info({ type: event.type }, "Stripe webhook received");

  try {
    if (event.type === "checkout.session.completed") {
      const order = await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);

      // Acknowledge Stripe first — Gelato submission is async best-effort.
      // The periodic retry worker self-heals any transient Gelato failures.
      res.json({ received: true });

      if (order?.pdfUrl) {
        claimAndSubmitToGelato(order).catch(err =>
          logger.error({ err, orderId: order.id }, "Async Gelato submission failed"),
        );
      } else if (order) {
        logger.info(
          { orderId: order.id },
          "Payment confirmed but PDF not yet uploaded — Gelato triggered on PDF upload or retry worker",
        );
      }
    } else if (event.type === "checkout.session.expired") {
      await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
      res.json({ received: true });
    } else {
      res.json({ received: true });
    }
  } catch (err) {
    // DB error — return 5xx so Stripe retries the event.
    logger.error({ err, type: event.type }, "Failed to process Stripe webhook — Stripe will retry");
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * Atomically transition payment_pending → processing.
 *
 * The WHERE clause is constrained to `status = 'payment_pending'` so:
 *   • Replayed events that arrive after payment are already confirmed → no-op.
 *   • Replayed events that arrive after Gelato has moved the order to
 *     'printing'/'shipped'/etc. → no-op; the downstream status is preserved.
 *
 * Returns the updated row on success, null on replay/not-found.
 * Throws on DB error so the caller returns 5xx for Stripe retry.
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<typeof ordersTable.$inferSelect | null> {
  const orderId = session.metadata?.["orderId"];
  if (!orderId) {
    logger.warn({ sessionId: session.id }, "No orderId in session metadata — skipping");
    return null;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  // Constrained to payment_pending → replayed/duplicate events are no-ops.
  const updated = await db
    .update(ordersTable)
    .set({ status: "processing", stripePaymentIntentId: paymentIntentId, updatedAt: new Date() })
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.status, "payment_pending")))
    .returning();

  if (updated.length === 0) {
    logger.info({ orderId }, "Order already past payment_pending — replayed Stripe event ignored");
    return null;
  }

  const order = updated[0]!;
  logger.info({ orderId, paymentIntentId }, "Order payment confirmed → processing");
  return order;
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.["orderId"];
  if (!orderId) return;

  // Only cancel if still pending — don't cancel an order that has already paid.
  await db
    .update(ordersTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.status, "payment_pending")));

  logger.info({ orderId }, "Order cancelled — checkout session expired");
}

// ─── POST /api/webhooks/gelato ────────────────────────────────────────────────
// In production, GELATO_WEBHOOK_TOKEN must be set — fails closed if absent.

const GELATO_WEBHOOK_TOKEN = process.env["GELATO_WEBHOOK_TOKEN"] ?? "";

if (process.env["NODE_ENV"] === "production" && !GELATO_WEBHOOK_TOKEN) {
  throw new Error("GELATO_WEBHOOK_TOKEN is required in production to authenticate Gelato webhooks");
}

router.post("/gelato", async (req: Request, res: Response) => {
  if (GELATO_WEBHOOK_TOKEN) {
    const token = req.headers["x-gelato-webhook-token"] as string | undefined;
    if (token !== GELATO_WEBHOOK_TOKEN) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  } else {
    logger.warn("GELATO_WEBHOOK_TOKEN not set — accepting unverified Gelato webhook (dev only)");
  }

  const body = req.body as {
    event?: string;
    order?: {
      id?: string;
      orderReferenceId?: string;
      fulfillmentStatus?: string;
      shipments?: { trackingCode?: string; estimatedDeliveryDate?: string }[];
    };
  };

  const referenceId = body.order?.orderReferenceId;
  logger.info({ event: body.event, referenceId }, "Gelato webhook received");

  if (!referenceId) {
    res.json({ received: true });
    return;
  }

  try {
    const fulfillmentStatus = body.order?.fulfillmentStatus;
    const shipments = body.order?.shipments ?? [];
    const tracking = shipments[0]?.trackingCode;
    const estimatedDelivery = shipments[0]?.estimatedDeliveryDate?.slice(0, 10);

    let newStatus: "printing" | "shipped" | "delivered" | undefined;
    if (fulfillmentStatus === "printed" || fulfillmentStatus === "in_production") {
      newStatus = "printing";
    } else if (fulfillmentStatus === "shipped") {
      newStatus = "shipped";
    } else if (fulfillmentStatus === "delivered") {
      newStatus = "delivered";
    }

    if (newStatus) {
      // Read current status to enforce monotonic transitions.
      const [current] = await db
        .select({ status: ordersTable.status })
        .from(ordersTable)
        .where(eq(ordersTable.id, referenceId))
        .limit(1);

      if (!current) {
        logger.warn({ referenceId }, "Gelato webhook: order not found");
        res.json({ received: true });
        return;
      }

      const currentRank = STATUS_RANK[current.status] ?? -1;
      const newRank = STATUS_RANK[newStatus] ?? -1;

      if (newRank <= currentRank) {
        logger.info(
          { referenceId, current: current.status, attempted: newStatus },
          "Gelato webhook: rejecting status regression",
        );
        res.json({ received: true, skipped: "status would regress" });
        return;
      }

      await db
        .update(ordersTable)
        .set({
          status: newStatus,
          ...(tracking ? { trackingNumber: tracking } : {}),
          ...(estimatedDelivery ? { estimatedDelivery } : {}),
          updatedAt: new Date(),
        })
        .where(eq(ordersTable.id, referenceId));

      logger.info({ referenceId, status: newStatus, tracking }, "Order status advanced from Gelato");
    }
  } catch (err) {
    logger.error({ err, referenceId }, "Failed to process Gelato webhook");
    res.status(500).json({ error: "Webhook processing failed" });
    return;
  }

  res.json({ received: true });
});

// ─── POST /api/webhooks/submit-print ─────────────────────────────────────────
// Called by the PDF generation service (Task #9) when a print-ready PDF is ready.

const PRINT_SERVICE_TOKEN = process.env["PRINT_SERVICE_TOKEN"] ?? "";

function requirePrintServiceToken(req: Request, res: Response, next: () => void) {
  if (!PRINT_SERVICE_TOKEN) {
    res.status(501).json({ error: "PRINT_SERVICE_TOKEN not configured" });
    return;
  }
  const provided = req.headers["x-print-service-token"] as string | undefined;
  if (!provided || provided !== PRINT_SERVICE_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.post("/submit-print", requirePrintServiceToken, async (req: Request, res: Response) => {
  const { orderId, pdfUrl } = req.body as { orderId?: string; pdfUrl?: string };

  if (!orderId || !pdfUrl) {
    res.status(400).json({ error: "orderId and pdfUrl are required" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  await db
    .update(ordersTable)
    .set({ pdfUrl, updatedAt: new Date() })
    .where(eq(ordersTable.id, orderId));

  if (order.status !== "processing" && order.status !== "printing") {
    logger.info({ orderId, status: order.status }, "PDF received but payment not confirmed — deferring");
    res.json({ queued: true, message: "PDF saved; Gelato will be submitted when payment is confirmed" });
    return;
  }

  const updatedOrder = { ...order, pdfUrl };
  try {
    await claimAndSubmitToGelato(updatedOrder);
    const [fresh] = await db
      .select({ gelatoOrderId: ordersTable.gelatoOrderId, status: ordersTable.status })
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (fresh?.gelatoOrderId && !fresh.gelatoOrderId.startsWith("claiming-")) {
      res.json({ submitted: true, gelatoOrderId: fresh.gelatoOrderId });
    } else {
      res.json({ submitted: false, reason: "Gelato not configured or already in progress" });
    }
  } catch (err) {
    logger.error({ err, orderId }, "Gelato submission failed via submit-print");
    res.status(500).json({ error: "Print submission failed" });
  }
});

export default router;
