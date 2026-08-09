/**
 * Returns the canonical HTTPS origin for this API server.
 *
 * Security: NEVER derive this from request headers (Host, X-Forwarded-Host,
 * etc.). An attacker who controls those headers could redirect Stripe callbacks
 * to an attacker domain or cause Gelato to fetch and print attacker-hosted content.
 *
 * Resolution order:
 *   1. CANONICAL_API_URL  — explicit config; required in production.
 *   2. REPLIT_DEV_DOMAIN  — Replit's injected preview domain; dev/staging only.
 *   3. localhost:3001     — local dev fallback.
 */
export function getCanonicalBaseUrl(): string {
  const canonical = process.env["CANONICAL_API_URL"];
  if (canonical) return canonical.replace(/\/+$/, "");

  if (process.env["NODE_ENV"] === "production") {
    throw new Error(
      "CANONICAL_API_URL must be set in production. " +
      "Set it to the full HTTPS origin of this API server (e.g. https://api.example.com).",
    );
  }

  // Development / staging: use the Replit preview domain if available.
  const replitDomain = process.env["REPLIT_DEV_DOMAIN"];
  if (replitDomain) {
    return replitDomain.startsWith("http") ? replitDomain : `https://${replitDomain}`;
  }

  return "http://localhost:3001";
}
