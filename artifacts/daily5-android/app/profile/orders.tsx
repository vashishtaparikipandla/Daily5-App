import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/ProtectedScreen';
import { useOrders } from '@/contexts/OrdersContext';
import {
  PrintOrder,
  formatOrderStatus,
  orderStatusColor,
  formatTotalCents,
  formatOrderDate,
  formatDeliveryDate,
} from '@/lib/orders';

function OrderCard({ order, colors }: { order: PrintOrder; colors: ReturnType<typeof useColors> }) {
  const statusColor = orderStatusColor(order.status, {
    primary: colors.primary,
    tertiary: colors.tertiary,
    destructive: colors.destructive,
    foreground: colors.foreground,
  });

  return (
    <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={[styles.bookSpine, { backgroundColor: colors.primary }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.bookTitle, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
            {order.bookTitle}
          </Text>
          <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>
            Ordered {formatOrderDate(order.createdAt)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor + '40' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {formatOrderStatus(order.status)}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={[styles.cardDetails, { borderTopColor: colors.border }]}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Order ID</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>
            #{order.id.slice(-8).toUpperCase()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Pages</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>{order.pageCount} pages</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Total</Text>
          <Text style={[styles.detailValue, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            {formatTotalCents(order.totalCents)}
          </Text>
        </View>
        {order.estimatedDelivery && order.status !== 'delivered' && order.status !== 'cancelled' && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Est. delivery</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {formatDeliveryDate(order.estimatedDelivery)}
            </Text>
          </View>
        )}
        {order.trackingNumber && (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Tracking</Text>
            <Text style={[styles.detailValue, { color: colors.primary }]}>{order.trackingNumber}</Text>
          </View>
        )}
      </View>

      {/* Shipping address */}
      <View style={[styles.shippingRow, { borderTopColor: colors.border }]}>
        <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
        <Text style={[styles.shippingText, { color: colors.mutedForeground }]} numberOfLines={1}>
          {order.shippingAddress.name} · {order.shippingAddress.city}, {order.shippingAddress.state}
        </Text>
      </View>
    </View>
  );
}

function OrdersContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { orders, loading, refreshOrders } = useOrders();
  const [refreshing, setRefreshing] = React.useState(false);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshOrders();
    } finally {
      setRefreshing(false);
    }
  }, [refreshOrders]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>Orders</Text>
        <TouchableOpacity onPress={handleRefresh} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="refresh-outline" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cube-outline" size={52} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
            No orders yet
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Open any book and tap the print icon to order a physical copy.
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => o.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => <OrderCard order={item} colors={colors} />}
          ListHeaderComponent={
            <Text style={[styles.listHeader, { color: colors.tertiary }]}>
              {orders.length} order{orders.length !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}
    </View>
  );
}

export default function OrdersScreen() {
  return (
    <ProtectedScreen>
      <OrdersContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22 },
  emptySub: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },

  list: { padding: 16, gap: 14, paddingBottom: 40 },
  listHeader: { fontSize: 11, fontFamily: 'Inter_500Medium', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },

  orderCard: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingRight: 16,
  },
  bookSpine: { width: 5, alignSelf: 'stretch', minHeight: 48 },
  bookTitle: { fontSize: 16, letterSpacing: 0.1, paddingLeft: 8 },
  orderDate: { fontSize: 12, fontFamily: 'Inter_400Regular', paddingLeft: 8, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontFamily: 'Inter_500Medium' },

  cardDetails: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16, paddingVertical: 10, gap: 2,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  detailLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  detailValue: { fontSize: 13, fontFamily: 'Inter_400Regular' },

  shippingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 10,
  },
  shippingText: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },
});
