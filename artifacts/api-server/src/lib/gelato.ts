import { logger } from "./logger.js";

const GELATO_API_KEY = process.env["GELATO_API_KEY"] ?? "";
const GELATO_BASE = "https://order.gelatoapis.com";

// Gelato product UID for the softcover book.
// Must be set to a real product from your Gelato catalog before live orders.
// https://dashboard.gelato.com/products
const GELATO_PRODUCT_UID = process.env["GELATO_PRODUCT_UID"] ?? "";
const PLACEHOLDER_UID = "photobook-softcover-21x21-cm";

// Validate product UID at startup — don't let placeholder reach Gelato in production.
if (process.env["NODE_ENV"] === "production") {
  if (!GELATO_PRODUCT_UID) {
    throw new Error("GELATO_PRODUCT_UID must be set in production");
  }
  if (GELATO_PRODUCT_UID === PLACEHOLDER_UID) {
    throw new Error(
      `GELATO_PRODUCT_UID is still set to the placeholder value "${PLACEHOLDER_UID}". ` +
      "Replace it with a real product UID from your Gelato catalog before going live.",
    );
  }
} else if (!GELATO_PRODUCT_UID) {
  logger.warn(
    { placeholder: PLACEHOLDER_UID },
    "GELATO_PRODUCT_UID not set — using placeholder. " +
    "Real Gelato API calls will fail until you set a valid product UID.",
  );
}

const effectiveProductUid = GELATO_PRODUCT_UID || PLACEHOLDER_UID;

export interface GelatoOrderResponse {
  id: string;
  orderReferenceId: string;
  fulfillmentStatus: string;
}

export function parseShippingName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] ?? "", lastName: "" };
  const lastName = parts.pop() ?? "";
  return { firstName: parts.join(" "), lastName };
}

/**
 * Submit a print order to Gelato v4.
 *
 * Idempotency: the server-generated orderId is sent as both `orderReferenceId`
 * AND the `Idempotency-Key` header. Gelato deduplicates on the idempotency key,
 * so retrying after a network timeout returns the existing Gelato order rather
 * than creating a duplicate physical print job.
 *
 * Returns the Gelato order response, or null if GELATO_API_KEY is not set.
 * Throws on API error (caller handles retry via the periodic worker).
 */
export async function submitPrintOrder(
  orderId: string,
  pdfUrl: string,
  shippingName: string,
  shippingLine1: string,
  shippingLine2: string | undefined | null,
  shippingCity: string,
  shippingState: string,
  shippingZip: string,
  shippingCountry: string,
): Promise<GelatoOrderResponse | null> {
  if (!GELATO_API_KEY) {
    logger.warn({ orderId }, "GELATO_API_KEY not set — skipping print submission");
    return null;
  }

  const { firstName, lastName } = parseShippingName(shippingName);

  // Gelato v4 order payload
  // https://docs.gelato.com/reference/createorder
  const body = {
    orderType: "order",                  // "order" = live fulfillment; "draft_order" = preview only
    orderReferenceId: orderId,
    customerReferenceId: orderId,
    currency: "USD",
    items: [
      {
        itemReferenceId: `${orderId}-book`,
        productUid: effectiveProductUid,
        quantity: 1,
        files: [{ type: "default", url: pdfUrl }],
      },
    ],
    shippingAddress: {
      firstName,
      lastName,
      addressLine1: shippingLine1,
      ...(shippingLine2 ? { addressLine2: shippingLine2 } : {}),
      city: shippingCity,
      state: shippingState,
      postCode: shippingZip,
      country: shippingCountry,
    },
  };

  const resp = await fetch(`${GELATO_BASE}/v4/orders`, {
    method: "POST",
    headers: {
      "X-API-KEY": GELATO_API_KEY,
      "Content-Type": "application/json",
      // Idempotency key: Gelato returns the existing order on retry
      // rather than creating a duplicate physical book.
      "Idempotency-Key": orderId,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gelato API error ${resp.status}: ${text}`);
  }

  return resp.json() as Promise<GelatoOrderResponse>;
}
