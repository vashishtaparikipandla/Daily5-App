/**
 * API client for the Daily 5 API server.
 * All requests go to the same Replit domain as the app, at the /api prefix.
 */

import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';

function getApiBase(): string {
  const explicit = process.env["EXPO_PUBLIC_API_BASE_URL"];
  if (explicit) {
    const base = explicit.replace(/\/+$/, "");
    // Normalize: callers may set the bare origin (e.g. https://daily5.replit.app)
    // or the API-prefixed URL (https://daily5.replit.app/api). Either way,
    // all requests in this file are relative paths like /orders/... so we need
    // the /api prefix always present exactly once.
    return base.endsWith("/api") ? base : `${base}/api`;
  }

  const domain = process.env["EXPO_PUBLIC_DOMAIN"];
  if (domain) return `https://${domain}/api`;

  return "http://localhost:3001/api";
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getApiBase()}${path}`;
  const resp = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API ${resp.status}: ${text}`);
  }

  return resp.json() as Promise<T>;
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

/** The client sends order details; the server generates the cryptographic order ID. */
export interface CheckoutSessionRequest {
  bookMonthKey: string;
  bookTitle: string;
  pageCount: number;
  shippingName: string;
  shippingLine1: string;
  shippingLine2?: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
}

export interface CheckoutSessionResponse {
  /** Stripe-hosted checkout URL to open in the browser */
  url: string;
  sessionId: string;
  /** Cryptographic UUID generated server-side — use this to poll status */
  orderId: string;
  /** Per-order upload capability token — required as X-PDF-Upload-Token header */
  pdfUploadToken: string;
}

export async function createCheckoutSession(
  req: CheckoutSessionRequest,
): Promise<CheckoutSessionResponse> {
  return apiFetch<CheckoutSessionResponse>("/orders/checkout-session", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// ─── PDF upload ───────────────────────────────────────────────────────────────

/**
 * Upload a locally-generated PDF to the API server so Gelato can fetch it.
 * Uses expo-file-system's multipart upload, which works with local file:// URIs.
 * Returns the public PDF URL stored on the server.
 */
export async function uploadOrderPdf(
  localUri: string,
  orderId: string,
  pdfUploadToken: string,
): Promise<string> {
  const base = getApiBase();
  const result = await uploadAsync(
    `${base}/orders/${orderId}/pdf`,
    localUri,
    {
      httpMethod: "POST",
      uploadType: FileSystemUploadType.MULTIPART,
      fieldName: "pdf",
      mimeType: "application/pdf",
      headers: { "x-pdf-upload-token": pdfUploadToken },
    },
  );

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`PDF upload failed: ${result.status} ${result.body}`);
  }

  const data = JSON.parse(result.body) as { pdfUrl: string };
  return data.pdfUrl;
}

// ─── Individual order status ──────────────────────────────────────────────────
// The list endpoint is admin-only (X-Internal-Token required).
// The mobile app fetches orders by their known IDs (stored locally after checkout).
// The public GET /orders/:id returns only non-PII status fields (no shipping address).

export interface ApiOrder {
  id: string;
  bookMonthKey: string;
  bookTitle: string;
  pageCount: number;
  status: string;
  totalCents: number;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Fetch a single order by ID. Returns null if not found or on network error. */
export async function fetchOrder(id: string): Promise<ApiOrder | null> {
  try {
    const data = await apiFetch<{ order: ApiOrder }>(`/orders/${id}`);
    return data.order;
  } catch {
    return null;
  }
}

/**
 * Fetch the latest status for each of the given order IDs from the backend.
 * IDs not found or producing network errors are silently skipped.
 */
export async function fetchOrdersByIds(ids: string[]): Promise<ApiOrder[]> {
  if (ids.length === 0) return [];
  const results = await Promise.allSettled(ids.map(id => fetchOrder(id)));
  return results
    .filter((r): r is PromiseFulfilledResult<ApiOrder | null> => r.status === "fulfilled")
    .map(r => r.value)
    .filter((o): o is ApiOrder => o !== null);
}

/**
 * Poll a single order until its status moves out of "payment_pending".
 * Returns the confirmed order, or null if the timeout expires.
 */
export async function pollOrderStatus(
  id: string,
  timeoutMs = 60_000,
  intervalMs = 2_000,
): Promise<ApiOrder | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const order = await fetchOrder(id);
    if (order && order.status !== "payment_pending") {
      return order;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return null;
}
