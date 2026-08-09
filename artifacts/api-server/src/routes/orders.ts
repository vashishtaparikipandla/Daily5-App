import { Router } from "express";
import { db, ordersTable, insertOrderSchema, type DbOrder } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireGoogleAuth } from "../middlewares/requireGoogleAuth";

const ordersRouter = Router();

// All orders routes require a verified Google access token.
// res.locals.userEmail is set by requireGoogleAuth — never trusted from the request.
ordersRouter.use("/orders", requireGoogleAuth);

/**
 * GET /api/orders
 * Returns all orders for the authenticated user, newest first.
 */
ordersRouter.get("/orders", async (req, res) => {
  const userEmail: string = res.locals.userEmail;
  try {
    const rows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userEmail, userEmail));

    rows.sort((a: DbOrder, b: DbOrder) => b.createdAt.localeCompare(a.createdAt));
    res.json({ orders: rows });
  } catch (err) {
    req.log.error({ err }, "GET /api/orders failed");
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

/**
 * POST /api/orders
 * Upsert a single order.
 *
 * Ownership enforcement:
 *   - userEmail is derived from the verified token and overwrites any value in
 *     the request body.
 *   - If a row with the same id already exists but belongs to a different user,
 *     the request is rejected with 403 to prevent cross-account modification.
 *   - Only server-controlled fields (status, trackingNumber, estimatedDelivery,
 *     updatedAt) are updated on conflict; all user-authored fields are immutable
 *     once the row is created.
 */
ordersRouter.post("/orders", async (req, res) => {
  const userEmail: string = res.locals.userEmail;

  // Overwrite any client-supplied userEmail with the server-verified value
  const payload = { ...req.body, userEmail };
  const parsed = insertOrderSchema.safeParse(payload);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid order payload", details: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  try {
    // Ownership check: if a row with this id exists, it must belong to the
    // authenticated user. This prevents a caller from updating another user's
    // order by submitting its id.
    const [existing] = await db
      .select({ id: ordersTable.id, userEmail: ordersTable.userEmail })
      .from(ordersTable)
      .where(eq(ordersTable.id, data.id));

    if (existing && existing.userEmail !== userEmail) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [row] = await db
      .insert(ordersTable)
      .values(data)
      .onConflictDoUpdate({
        target: ordersTable.id,
        set: {
          // Only fields the print service may legitimately update on conflict
          status: data.status,
          trackingNumber: data.trackingNumber,
          estimatedDelivery: data.estimatedDelivery,
          updatedAt: data.updatedAt,
        },
      })
      .returning();

    res.status(201).json({ order: row });
  } catch (err) {
    req.log.error({ err }, "POST /api/orders failed");
    res.status(500).json({ error: "Failed to save order" });
  }
});

/**
 * GET /api/orders/:id
 * Fetch a single order. Ownership enforced via the verified token email.
 */
ordersRouter.get("/orders/:id", async (req, res) => {
  const userEmail: string = res.locals.userEmail;
  const { id } = req.params;

  try {
    const [row] = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, id), eq(ordersTable.userEmail, userEmail)));

    if (!row) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({ order: row });
  } catch (err) {
    req.log.error({ err }, "GET /api/orders/:id failed");
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

export default ordersRouter;
