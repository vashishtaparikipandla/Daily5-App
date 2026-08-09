import AsyncStorage from '@react-native-async-storage/async-storage';
import { uid } from './data';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'printing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface PrintOrder {
  id: string;
  bookMonthKey: string;      // YYYY-MM
  bookTitle: string;         // e.g. "August 2026"
  pageCount: number;
  status: OrderStatus;
  shippingAddress: ShippingAddress;
  totalCents: number;        // price in cents
  createdAt: string;         // ISO timestamp
  updatedAt: string;
  trackingNumber?: string;
  estimatedDelivery?: string; // ISO date string
}

const FORMAT_VERSION = 1;

interface StoredOrders {
  v: number;
  orders: PrintOrder[];
}

// ─── Per-user local storage ───────────────────────────────────────────────────

/**
 * Each user's orders are stored under their own key so accounts never mix.
 */
function ordersKey(userEmail: string): string {
  return `@daily5/orders/${userEmail}`;
}

export async function loadOrders(userEmail: string): Promise<PrintOrder[]> {
  try {
    const raw = await AsyncStorage.getItem(ordersKey(userEmail));
    if (!raw) return [];
    const parsed: StoredOrders = JSON.parse(raw);
    if (parsed.v !== FORMAT_VERSION) return [];
    return parsed.orders ?? [];
  } catch {
    return [];
  }
}

export async function saveOrders(orders: PrintOrder[], userEmail: string): Promise<void> {
  const stored: StoredOrders = { v: FORMAT_VERSION, orders };
  await AsyncStorage.setItem(ordersKey(userEmail), JSON.stringify(stored));
}

/** Wipe the local cache for a user (e.g. on account deletion). */
export async function clearOrders(userEmail: string): Promise<void> {
  await AsyncStorage.removeItem(ordersKey(userEmail));
}

/**
 * One-time migration: move any orders stored under the legacy shared key
 * (`@daily5/orders`, used before per-user scoping) into the user's keyed
 * slot. Runs at app startup; subsequent runs are no-ops because the legacy
 * key is removed after a successful migration.
 */
const LEGACY_KEY = '@daily5/orders';
const MIGRATION_FLAG_KEY = '@daily5/orders_migrated';

export async function migrateLegacyOrders(userEmail: string): Promise<void> {
  try {
    const [already, raw] = await Promise.all([
      AsyncStorage.getItem(MIGRATION_FLAG_KEY),
      AsyncStorage.getItem(LEGACY_KEY),
    ]);
    if (already === 'true' || !raw) {
      // Already migrated or nothing to migrate
      if (!already) await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return;
    }

    const parsed: StoredOrders = JSON.parse(raw);
    const legacyOrders: PrintOrder[] = parsed.v === FORMAT_VERSION ? (parsed.orders ?? []) : [];

    if (legacyOrders.length > 0) {
      // Merge into the per-user slot (per-user wins on conflict)
      const existing = await loadOrders(userEmail);
      const map = new Map<string, PrintOrder>();
      for (const o of legacyOrders) map.set(o.id, o);
      for (const o of existing)      map.set(o.id, o); // per-user wins
      const merged = Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      await saveOrders(merged, userEmail);
    }

    // Remove legacy key and mark migration done atomically
    await AsyncStorage.multiSet([[MIGRATION_FLAG_KEY, 'true']]);
    await AsyncStorage.removeItem(LEGACY_KEY);
  } catch {
    // Non-fatal — worst case the migration retries next launch
  }
}

// ─── API sync ─────────────────────────────────────────────────────────────────

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');

function authHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

/**
 * Fetch all orders for the authenticated user from the API server.
 * The server derives the user identity from the verified Bearer token.
 * Returns null on network error, missing token, or non-OK response.
 */
export async function fetchOrdersFromServer(accessToken: string): Promise<PrintOrder[] | null> {
  if (!API_BASE || !accessToken) return null;
  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      headers: authHeaders(accessToken),
    });
    if (!res.ok) return null;
    const data: { orders: PrintOrder[] } = await res.json();
    return data.orders ?? [];
  } catch {
    return null;
  }
}

/**
 * Push a single order to the API server (upsert semantics).
 * The server derives userEmail from the verified Bearer token — never from body.
 * Returns true on success; false on any error.
 */
export async function syncOrderToServer(order: PrintOrder, accessToken: string): Promise<boolean> {
  if (!API_BASE || !accessToken) return false;
  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(accessToken) },
      body: JSON.stringify(order),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Full sync: upload any local orders the server doesn't have, then fetch the
 * canonical server list and merge. Returns the merged list, or null if the
 * server is unreachable or no token is available (caller keeps local cache).
 *
 * Merge rule: server wins on status/trackingNumber/estimatedDelivery (print-
 * service fields). Client wins on all user-authored fields.
 */
export async function fullSync(
  localOrders: PrintOrder[],
  accessToken: string,
): Promise<PrintOrder[] | null> {
  if (!accessToken) return null;

  const remote = await fetchOrdersFromServer(accessToken);
  if (remote === null) return null; // network failure — keep local

  const remoteIds = new Set(remote.map(o => o.id));

  // Upload any local order the server has never seen (created offline or whose
  // initial POST failed). Best-effort — next sync retries on continued failure.
  const localOnly = localOrders.filter(o => !remoteIds.has(o.id));
  await Promise.all(localOnly.map(o => syncOrderToServer(o, accessToken)));

  // Merge: local authoritative for user-authored fields; server controls
  // status, trackingNumber, estimatedDelivery.
  const map = new Map<string, PrintOrder>();
  for (const o of localOrders) map.set(o.id, o);
  for (const o of remote) {
    const local = map.get(o.id);
    if (local) {
      map.set(o.id, {
        ...local,
        status: o.status,
        trackingNumber: o.trackingNumber,
        estimatedDelivery: o.estimatedDelivery,
      });
    } else {
      // Server-only order (placed on another device) — take it wholesale
      map.set(o.id, o);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─── Order factory ────────────────────────────────────────────────────────────

export function createOrder(
  bookMonthKey: string,
  bookTitle: string,
  pageCount: number,
  shippingAddress: ShippingAddress,
): PrintOrder {
  const now = new Date().toISOString();
  const delivery = new Date();
  delivery.setDate(delivery.getDate() + 10);

  return {
    id: uid(),
    bookMonthKey,
    bookTitle,
    pageCount,
    status: 'processing',
    shippingAddress,
    totalCents: 2998,          // $24.99 book + $4.99 shipping
    createdAt: now,
    updatedAt: now,
    estimatedDelivery: delivery.toISOString().slice(0, 10),
  };
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatOrderStatus(status: OrderStatus): string {
  switch (status) {
    case 'pending':     return 'Pending';
    case 'processing':  return 'Processing';
    case 'printing':    return 'Printing';
    case 'shipped':     return 'Shipped';
    case 'delivered':   return 'Delivered';
    case 'cancelled':   return 'Cancelled';
  }
}

export function orderStatusColor(
  status: OrderStatus,
  colors: { primary: string; tertiary: string; destructive: string; foreground: string },
) {
  switch (status) {
    case 'delivered': return colors.primary;
    case 'shipped':   return '#4CAF50';
    case 'printing':  return '#FF9800';
    case 'processing':return colors.foreground;
    case 'pending':   return colors.tertiary;
    case 'cancelled': return colors.destructive;
  }
}

export function formatTotalCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatDeliveryDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatOrderDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
