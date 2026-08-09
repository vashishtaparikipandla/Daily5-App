/**
 * OrdersContext — per-user, local-first with durable server sync
 *
 * Identity isolation:
 *   Orders are stored under a per-user AsyncStorage key (@daily5/orders/<email>)
 *   so two accounts on the same device never mix. `activeEmailRef` is updated
 *   SYNCHRONOUSLY on every identity change and checked after every await, so
 *   stale async callbacks from a prior identity can never commit their results.
 *
 * Two-effect design:
 *   Effect 1 (deps: [userEmail]) — identity reset. Clears in-memory state and
 *   loads the new account's local cache from AsyncStorage immediately.
 *
 *   Effect 2 (deps: [userEmail, accessToken, loading]) — server sync. Fires
 *   whenever both identity AND token are available. A `lastSyncKey` ref
 *   prevents redundant syncs for the same (email, token) pair.
 *
 * Offline durability:
 *   placeOrder writes locally first + best-effort POST. fullSync (on every
 *   sign-in or token-arrival) uploads locally-stored orders the server hasn't
 *   seen, then fetches the canonical list and merges.
 */

import React, {
  createContext, useContext, useState, useEffect, useCallback, useRef,
} from 'react';
import {
  loadOrders, saveOrders, createOrder, syncOrderToServer, fullSync,
  migrateLegacyOrders,
  type PrintOrder, type ShippingAddress, type OrderStatus,
} from '@/lib/orders';
import { useApp } from '@/contexts/AppContext';
import { fetchOrdersByIds, type ApiOrder } from '@/lib/api-client';

interface OrdersContextValue {
  orders: PrintOrder[];
  /** True while initial local load is in progress. */
  loading: boolean;
  /** True while a background server sync is in progress. */
  syncing: boolean;
  placeOrder: (
    bookMonthKey: string,
    bookTitle: string,
    pageCount: number,
    address: ShippingAddress,
    /** Pre-generated order ID from the server (e.g. from Stripe checkout session) */
    orderId?: string,
    /** Initial status from backend confirmation */
    initialStatus?: OrderStatus,
  ) => Promise<PrintOrder>;
  getOrdersForBook: (monthKey: string) => PrintOrder[];
  /** Pull latest status for all known orders from the backend. */
  refreshOrders: () => Promise<void>;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

/**
 * Merge remote API status updates into the local order list.
 *
 * The public GET /orders/:id endpoint returns only non-PII status fields
 * (id, status, trackingNumber, estimatedDelivery, etc.) — NOT shipping address.
 * We preserve every field of the local order and only overwrite the fields
 * that the API actually returns.
 */
function mergeStatusUpdates(local: PrintOrder[], remote: ApiOrder[]): PrintOrder[] {
  const remoteById = new Map(remote.map(r => [r.id, r]));
  return local.map(localOrder => {
    const update = remoteById.get(localOrder.id);
    if (!update) return localOrder;
    return {
      ...localOrder,
      status: (update.status as OrderStatus) ?? localOrder.status,
      trackingNumber: update.trackingNumber ?? localOrder.trackingNumber,
      estimatedDelivery: update.estimatedDelivery ?? localOrder.estimatedDelivery,
      updatedAt: update.updatedAt,
    };
  });
}

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken } = useApp();
  const userEmail = user?.email ?? null;

  const [orders, setOrders]   = useState<PrintOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  /**
   * Updated SYNCHRONOUSLY on identity change. Every async callback captures
   * the email it was started for and bails if this ref no longer matches.
   */
  const activeEmailRef = useRef<string | null>(null);

  /**
   * Deduplicates server syncs. Stores the last "<email>:<token>" key that a
   * sync was started for, preventing double-syncing when Effect 2 re-fires
   * due to `loading` transitioning to false while email+token are unchanged.
   */
  const lastSyncKey = useRef<string | null>(null);

  // ── Effect 1: Identity reset ─────────────────────────────────────────────
  useEffect(() => {
    const email = userEmail;
    activeEmailRef.current = email; // synchronous — guards all subsequent awaits

    setOrders([]);
    setLoading(true);
    setSyncing(false);
    lastSyncKey.current = null;

    if (!email) {
      setLoading(false);
      return;
    }

    // Migrate any legacy shared-key orders to the per-user key (one-time)
    migrateLegacyOrders(email)
      .catch(() => {})
      .then(() => loadOrders(email))
      .then(local => {
        if (activeEmailRef.current !== email) return;
        setOrders(local);
        setLoading(false);
      });
  }, [userEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: Server sync ────────────────────────────────────────────────
  useEffect(() => {
    const email = userEmail;
    const token = accessToken;
    if (!email || !token || loading) return;

    const syncKey = `${email}:${token}`;
    if (lastSyncKey.current === syncKey) return;
    lastSyncKey.current = syncKey;

    loadOrders(email).then(local => {
      if (activeEmailRef.current !== email) return;
      runFullSync(email, local, token);
    });
  }, [userEmail, accessToken, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Background full sync ─────────────────────────────────────────────────
  async function runFullSync(email: string, currentLocal: PrintOrder[], token: string) {
    setSyncing(true);
    try {
      const merged = await fullSync(currentLocal, token);
      if (activeEmailRef.current !== email) return;
      if (merged === null) return; // network failure — keep local

      setOrders(merged);
      saveOrders(merged, email).catch(() => {});
    } finally {
      if (activeEmailRef.current === email) setSyncing(false);
    }
  }

  // ── Pull-to-refresh: fetch live status for known order IDs ───────────────
  // Uses the public GET /orders/:id endpoint (no auth needed) to get the latest
  // status, tracking, and delivery date. Preserves local shipping address since
  // the public endpoint doesn't return PII.
  const refreshOrders = useCallback(async () => {
    const email = activeEmailRef.current;
    if (!email) return;

    try {
      const current = await loadOrders(email);
      if (current.length === 0) return;

      const ids = current.map(o => o.id);
      const remote = await fetchOrdersByIds(ids);
      if (remote.length === 0) return;

      const merged = mergeStatusUpdates(current, remote);
      if (activeEmailRef.current !== email) return;
      setOrders(merged);
      saveOrders(merged, email).catch(() => {});
    } catch {
      // Silently ignore network errors on manual refresh
    }
  }, []);

  // ── Place order: local-first + best-effort POST ──────────────────────────
  const placeOrder = useCallback(async (
    bookMonthKey: string,
    bookTitle: string,
    pageCount: number,
    address: ShippingAddress,
    orderId?: string,
    initialStatus?: OrderStatus,
  ): Promise<PrintOrder> => {
    if (!userEmail) throw new Error('Must be signed in to place an order');

    const order = createOrder(bookMonthKey, bookTitle, pageCount, address, orderId, initialStatus);

    // Idempotent: replace an existing record with the same ID
    const current = await loadOrders(userEmail);
    const next = [order, ...current.filter(o => o.id !== order.id)];
    setOrders(next);
    await saveOrders(next, userEmail);

    // Best-effort POST to server. If offline, fullSync will upload on next connection.
    if (accessToken) {
      syncOrderToServer(order, accessToken).catch(() => {});
    }

    return order;
  }, [orders, userEmail, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const getOrdersForBook = useCallback(
    (monthKey: string) => orders.filter(o => o.bookMonthKey === monthKey),
    [orders],
  );

  return (
    <OrdersContext.Provider value={{ orders, loading, syncing, placeOrder, getOrdersForBook, refreshOrders }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be inside OrdersProvider');
  return ctx;
}
