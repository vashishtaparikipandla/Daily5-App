---
name: Stripe + Gelato print integration
description: Architecture decisions and security constraints for the order payment and print fulfillment pipeline.
---

# Stripe + Gelato print integration

## Payment approach
Used Stripe Checkout (hosted checkout page) instead of `@stripe/stripe-react-native`. 

**Why:** The native SDK requires a fully compiled native build; Expo Go and development mode don't support it. Hosted Checkout works in any browser/WebView via `expo-web-browser` and is PCI-compliant with no card data touching our server.

**How to apply:** The mobile app calls `POST /api/orders/checkout-session`, opens the returned URL in `WebBrowser.openBrowserAsync()`, then polls `GET /api/orders/:id` until status changes from `payment_pending`.

## Security constraints enforced
- `GET /api/orders` (list all) requires `X-Internal-Token` header matching `INTERNAL_API_TOKEN` env var — fail closed if not configured (501).
- `POST /api/webhooks/submit-print` requires `X-Print-Service-Token` header matching `PRINT_SERVICE_TOKEN` — fail closed if not configured (501).
- Stripe webhook: signature verified when `STRIPE_WEBHOOK_SECRET` is set; in production (NODE_ENV=production) it rejects all unverified events; in dev it logs a warning and accepts.
- Individual order GET (`/api/orders/:id`) is public but only returns safe fields (strips stripeSessionId, stripePaymentIntentId, pdfUrl).

## Idempotency
- Checkout session creation uses `onConflictDoNothing()` on orderId — safe to retry.
- Gelato submission checks `order.gelatoOrderId` before calling API — duplicate Stripe webhook events won't re-submit.
- `submit-print` endpoint also guards on `gelatoOrderId` presence.

## Mobile cancel/timeout path
When polling times out (60s), the app shows an alert ("payment not confirmed") and does NOT advance to the confirmation screen. The backend record stays `payment_pending` — if Stripe later confirms it, the order will appear in the Orders screen on next refresh.

## Print PDF deferral
Gelato submission is deferred until a PDF URL is available (Task #9's responsibility). When PDF is ready, Task #9 calls `POST /api/webhooks/submit-print` with the `PRINT_SERVICE_TOKEN`. The webhook handler checks payment status before submitting to Gelato.

## Env vars required to activate
- `STRIPE_SECRET_KEY` — Stripe payments
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook verification (required in prod)
- `GELATO_API_KEY` — print submission
- `INTERNAL_API_TOKEN` — admin order list endpoint
- `PRINT_SERVICE_TOKEN` — PDF service → Gelato trigger
- `GELATO_PRODUCT_UID` — Gelato product to order (optional, has placeholder default)
