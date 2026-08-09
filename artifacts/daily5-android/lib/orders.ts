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

const ORDERS_KEY = '@daily5/orders';
const FORMAT_VERSION = 1;

interface StoredOrders {
  v: number;
  orders: PrintOrder[];
}

export async function loadOrders(): Promise<PrintOrder[]> {
  try {
    const raw = await AsyncStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed: StoredOrders = JSON.parse(raw);
    if (parsed.v !== FORMAT_VERSION) return [];
    return parsed.orders ?? [];
  } catch {
    return [];
  }
}

export async function saveOrders(orders: PrintOrder[]): Promise<void> {
  const stored: StoredOrders = { v: FORMAT_VERSION, orders };
  await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(stored));
}

export function createOrder(
  bookMonthKey: string,
  bookTitle: string,
  pageCount: number,
  shippingAddress: ShippingAddress,
): PrintOrder {
  const now = new Date().toISOString();
  // Simulate delivery 7–10 business days out
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

export function orderStatusColor(status: OrderStatus, colors: { primary: string; tertiary: string; destructive: string; foreground: string }) {
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
