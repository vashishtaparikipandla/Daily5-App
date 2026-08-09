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
 *   whenever both identity AND token are available (handles the cold-start case
 *   where the token arrives from SecureStore after the user is already set).
 *   A `lastSyncKey` ref prevents redundant syncs for the same (email, token).
 *
 * Offline durability:
 *   placeOrder writes locally first + best-effort POST. fullSync (on every
 *   sign-in or token-arrival) uploads each locally-stored order the server
 *   hasn't seen, then fetches the canonical list and merges.
 *
 * Server auth:
 *   All API calls use Authorization: Bearer <accessToken>. The server verifies
 *   the token and derives userEmail from it — never trusted from the client.
 *   Demo accounts (no token) are local-only.
 */

import React, {
  createContext, useContext, useState, useEffect, useCallback, useRef,
} from 'react';
import {
  loadOrders, saveOrders, createOrder, syncOrderToServer, fullSync,
  migrateLegacyOrders,
  PrintOrder, ShippingAddress,
} from '@/lib/orders';
import { useApp } from '@/contexts/AppContext';

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
  ) => Promise<PrintOrder>;
  getOrdersForBook: (monthKey: string) => PrintOrder[];
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const { user, accessToken } = useApp();
  const userEmail = user?.email ?? null;

  const [orders, setOrders]   = useState<PrintOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  /**
   * Set SYNCHRONOUSLY on identity change. Every async callback captures the
   * email it was started for and bails if this ref no longer matches.
   */
  const activeEmailRef = useRef<string | null>(null);

  /**
   * Deduplicate server syncs. Stores the last "<email>:<token>" key that a
   * sync was started for. Prevents double-syncing when Effect 2 re-fires due
   * to `loading` transitioning to false while email+token are unchanged.
   */
  const lastSyncKey = useRef<string | null>(null);

  // ── Effect 1: Identity reset ─────────────────────────────────────────────
  // Runs when the signed-in account changes. Clears state synchronously, then
  // loads the new account's local cache (no server call here).
  useEffect(() => {
    const email = userEmail;
    activeEmailRef.current = email; // synchronous — guards all subsequent awaits

    setOrders([]);
    setLoading(true);
    setSyncing(false);
    lastSyncKey.current = null; // reset so Effect 2 will sync for the new identity

    if (!email) {
      setLoading(false);
      return;
    }

    // Migrate any legacy shared-key orders to the per-user key (one-time)
    migrateLegacyOrders(email)
      .catch(() => {})
      .then(() => loadOrders(email))
      .then(local => {
        if (activeEmailRef.current !== email) return; // identity changed mid-load
        setOrders(local);
        setLoading(false);
      });
  }, [userEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: Server sync ────────────────────────────────────────────────
  // Runs when identity, token, or loading state changes. Handles:
  //   • Fresh sign-in (token set at same time as email)
  //   • Cold-start (token arrives from SecureStore after user is already set)
  //   • Token refresh (new token for same identity)
  useEffect(() => {
    const email = userEmail;
    const token = accessToken;
    if (!email || !token || loading) return; // wait for local load to finish

    const syncKey = `${email}:${token}`;
    if (lastSyncKey.current === syncKey) return; // already synced with this combo
    lastSyncKey.current = syncKey;

    // Read fresh local orders (avoids stale closure over the `orders` state)
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
      if (activeEmailRef.current !== email) return; // identity changed while syncing
      if (merged === null) return;                  // network failure — keep local

      setOrders(merged);
      saveOrders(merged, email).catch(() => {});
    } finally {
      if (activeEmailRef.current === email) setSyncing(false);
    }
  }

  // ── Place order: local-first + best-effort POST ──────────────────────────
  const placeOrder = useCallback(async (
    bookMonthKey: string,
    bookTitle: string,
    pageCount: number,
    address: ShippingAddress,
  ): Promise<PrintOrder> => {
    if (!userEmail) throw new Error('Must be signed in to place an order');

    const order = createOrder(bookMonthKey, bookTitle, pageCount, address);
    const next = [order, ...orders];
    setOrders(next);
    await saveOrders(next, userEmail);

    // Best-effort POST. If offline, fullSync will upload it on next connection.
    if (accessToken) {
      syncOrderToServer(order, accessToken).catch(() => {});
    }

    return order;
  }, [orders, userEmail, accessToken]);

  const getOrdersForBook = useCallback(
    (monthKey: string) => orders.filter(o => o.bookMonthKey === monthKey),
    [orders],
  );

  return (
    <OrdersContext.Provider value={{ orders, loading, syncing, placeOrder, getOrdersForBook }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be inside OrdersProvider');
  return ctx;
}
