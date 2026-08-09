import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadOrders, saveOrders, createOrder, PrintOrder, ShippingAddress } from '@/lib/orders';

interface OrdersContextValue {
  orders: PrintOrder[];
  loading: boolean;
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
  const [orders, setOrders] = useState<PrintOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders().then(loaded => {
      setOrders(loaded);
      setLoading(false);
    });
  }, []);

  const placeOrder = useCallback(async (
    bookMonthKey: string,
    bookTitle: string,
    pageCount: number,
    address: ShippingAddress,
  ): Promise<PrintOrder> => {
    const order = createOrder(bookMonthKey, bookTitle, pageCount, address);
    const next = [order, ...orders];
    setOrders(next);
    await saveOrders(next);
    return order;
  }, [orders]);

  const getOrdersForBook = useCallback((monthKey: string) => {
    return orders.filter(o => o.bookMonthKey === monthKey);
  }, [orders]);

  return (
    <OrdersContext.Provider value={{ orders, loading, placeOrder, getOrdersForBook }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be inside OrdersProvider');
  return ctx;
}
