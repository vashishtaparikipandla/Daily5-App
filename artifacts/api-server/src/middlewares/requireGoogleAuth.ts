/**
 * requireGoogleAuth middleware
 *
 * Verifies the Google OAuth2 access token in the Authorization header and
 * attaches the verified email to res.locals.userEmail.
 *
 * Token introspection responses are cached in-process for 4 minutes so that
 * repeated requests in the same session don't hit Google's tokeninfo endpoint
 * on every call.
 *
 * Demo accounts (no Authorization header) receive 401.
 */

import { Request, Response, NextFunction } from "express";

interface TokenInfoOk {
  email: string;
  expires_in: string; // seconds remaining
  scope: string;
}

interface CacheEntry {
  email: string;
  expiresAt: number; // Date.now() ms
}

// In-process cache: token → {email, expiresAt}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 4 * 60 * 1000; // 4 minutes
const TOKENINFO_URL = "https://www.googleapis.com/oauth2/v1/tokeninfo";

/** Purge stale entries periodically so the map doesn't grow unbounded. */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}, CACHE_TTL_MS);

export async function requireGoogleAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization: Bearer <token> required" });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: "Empty bearer token" });
    return;
  }

  // Check cache first
  const cached = cache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    res.locals.userEmail = cached.email;
    next();
    return;
  }

  // Verify with Google
  try {
    const resp = await fetch(`${TOKENINFO_URL}?access_token=${encodeURIComponent(token)}`);
    if (!resp.ok) {
      res.status(401).json({ error: "Invalid or expired access token" });
      return;
    }
    const info = (await resp.json()) as TokenInfoOk;
    if (!info.email) {
      res.status(401).json({ error: "Token has no email scope" });
      return;
    }

    const expiresIn = parseInt(info.expires_in ?? "0", 10);
    const ttl = Math.min(expiresIn * 1000, CACHE_TTL_MS);
    if (ttl > 0) {
      cache.set(token, { email: info.email, expiresAt: Date.now() + ttl });
    }

    res.locals.userEmail = info.email;
    next();
  } catch (err) {
    req.log.error({ err }, "tokeninfo request failed");
    res.status(503).json({ error: "Could not verify token — try again" });
  }
}
