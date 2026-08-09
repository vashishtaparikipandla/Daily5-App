import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Platform, ActivityIndicator, Alert, KeyboardAvoidingView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProtectedScreen } from '@/components/ProtectedScreen';
import { useOrders } from '@/contexts/OrdersContext';
import { useDiary } from '@/contexts/DiaryContext';
import { monthLabel, estimatedPages } from '@/lib/data';
import { ShippingAddress, formatTotalCents, formatDeliveryDate } from '@/lib/orders';
import type { PrintOrder } from '@/lib/orders';

type Step = 'preview' | 'address' | 'payment' | 'confirmation';

const BOOK_PRICE_CENTS = 2499;
const SHIPPING_CENTS = 499;
const TOTAL_CENTS = BOOK_PRICE_CENTS + SHIPPING_CENTS;

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepDots({ step, colors }: { step: Step; colors: ReturnType<typeof useColors> }) {
  const steps: Step[] = ['preview', 'address', 'payment', 'confirmation'];
  const idx = steps.indexOf(step);
  return (
    <View style={styles.stepDots}>
      {steps.slice(0, 3).map((s, i) => (
        <View
          key={s}
          style={[
            styles.dot,
            { backgroundColor: i <= idx ? colors.primary : colors.border },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Step 1: Preview ─────────────────────────────────────────────────────────

function PreviewStep({
  monthKey,
  colors,
  onNext,
}: {
  monthKey: string;
  colors: ReturnType<typeof useColors>;
  onNext: () => void;
}) {
  const { getBook } = useDiary();
  const book = getBook(monthKey);
  const pages = estimatedPages(monthKey);
  const activeDays = book?.days.filter(d => d.entries.length > 0).length ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      {/* Book card */}
      <View style={[styles.bookCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.bookSpine, { backgroundColor: colors.primary }]} />
        <View style={styles.bookInfo}>
          <Text style={[styles.bookTitle, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
            {monthLabel(monthKey)}
          </Text>
          <Text style={[styles.bookMeta, { color: colors.mutedForeground }]}>
            {activeDays} days · ~{pages} pages · Softcover
          </Text>
        </View>
      </View>

      {/* What you get */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.tertiary }]}>WHAT YOU GET</Text>
        {[
          { icon: 'book-outline', text: 'High-quality softcover book' },
          { icon: 'color-palette-outline', text: 'Full-color interior printing' },
          { icon: 'shield-checkmark-outline', text: 'Acid-free, archival paper' },
          { icon: 'cube-outline', text: 'Delivered to your door in 7–10 days' },
        ].map(row => (
          <View key={row.text} style={styles.featureRow}>
            <Ionicons name={row.icon as any} size={18} color={colors.primary} />
            <Text style={[styles.featureText, { color: colors.foreground }]}>{row.text}</Text>
          </View>
        ))}
      </View>

      {/* Pricing */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.tertiary }]}>PRICING</Text>
        <View style={styles.priceRow}>
          <Text style={[styles.priceLabel, { color: colors.foreground }]}>Book ({pages} pages)</Text>
          <Text style={[styles.priceValue, { color: colors.foreground }]}>{formatTotalCents(BOOK_PRICE_CENTS)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={[styles.priceLabel, { color: colors.foreground }]}>Shipping</Text>
          <Text style={[styles.priceValue, { color: colors.foreground }]}>{formatTotalCents(SHIPPING_CENTS)}</Text>
        </View>
        <View style={[styles.priceRow, styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Total</Text>
          <Text style={[styles.totalValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{formatTotalCents(TOTAL_CENTS)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        onPress={onNext}
        activeOpacity={0.85}
      >
        <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Continue to Shipping</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Step 2: Shipping address ─────────────────────────────────────────────────

function AddressStep({
  colors,
  address,
  onChange,
  onNext,
  onBack,
}: {
  colors: ReturnType<typeof useColors>;
  address: Partial<ShippingAddress>;
  onChange: (f: Partial<ShippingAddress>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  function field(
    label: string,
    key: keyof ShippingAddress,
    placeholder: string,
    opts?: { half?: boolean },
  ) {
    return (
      <View style={[styles.fieldWrap, opts?.half && { flex: 1 }]}>
        <Text style={[styles.fieldLabel, { color: colors.tertiary }]}>{label}</Text>
        <TextInput
          value={(address[key] as string) ?? ''}
          onChangeText={v => onChange({ ...address, [key]: v })}
          placeholder={placeholder}
          placeholderTextColor={colors.tertiary}
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
          autoCorrect={false}
          autoCapitalize={key === 'country' || key === 'state' ? 'characters' : 'words'}
        />
      </View>
    );
  }

  const valid = !!(address.name && address.line1 && address.city && address.state && address.zip && address.country);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
        {field('Full name', 'name', 'Jane Smith')}
        {field('Street address', 'line1', '123 Main St')}
        {field('Apartment / Suite (optional)', 'line2', 'Apt 4B')}
        {field('City', 'city', 'New York')}
        <View style={styles.halfRow}>
          {field('State', 'state', 'NY', { half: true })}
          <View style={{ width: 12 }} />
          {field('ZIP code', 'zip', '10001', { half: true })}
        </View>
        {field('Country', 'country', 'US')}

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: valid ? colors.primary : colors.border }]}
          onPress={valid ? onNext : undefined}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryBtnText, { color: valid ? colors.primaryForeground : colors.mutedForeground }]}>
            Continue to Payment
          </Text>
          <Ionicons name="arrow-forward" size={18} color={valid ? colors.primaryForeground : colors.mutedForeground} />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Step 3: Payment ──────────────────────────────────────────────────────────

function PaymentStep({
  colors,
  monthKey,
  address,
  onPlace,
  onBack,
  placing,
}: {
  colors: ReturnType<typeof useColors>;
  monthKey: string;
  address: ShippingAddress;
  onPlace: () => void;
  onBack: () => void;
  placing: boolean;
}) {
  // Estimated delivery
  const delivery = new Date();
  delivery.setDate(delivery.getDate() + 10);

  return (
    <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      {/* Order summary */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.tertiary }]}>ORDER SUMMARY</Text>
        <View style={styles.priceRow}>
          <Text style={[styles.priceLabel, { color: colors.foreground }]}>{monthLabel(monthKey)}</Text>
          <Text style={[styles.priceValue, { color: colors.foreground }]}>{formatTotalCents(BOOK_PRICE_CENTS)}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={[styles.priceLabel, { color: colors.foreground }]}>Shipping</Text>
          <Text style={[styles.priceValue, { color: colors.foreground }]}>{formatTotalCents(SHIPPING_CENTS)}</Text>
        </View>
        <View style={[styles.priceRow, styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Total</Text>
          <Text style={[styles.totalValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{formatTotalCents(TOTAL_CENTS)}</Text>
        </View>
      </View>

      {/* Shipping address */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.tertiary }]}>SHIPPING TO</Text>
        <Text style={[styles.addressLine, { color: colors.foreground }]}>{address.name}</Text>
        <Text style={[styles.addressLine, { color: colors.mutedForeground }]}>{address.line1}{address.line2 ? `, ${address.line2}` : ''}</Text>
        <Text style={[styles.addressLine, { color: colors.mutedForeground }]}>{address.city}, {address.state} {address.zip}</Text>
        <Text style={[styles.addressLine, { color: colors.mutedForeground }]}>{address.country}</Text>
      </View>

      {/* Payment method */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.tertiary }]}>PAYMENT</Text>
        <View style={styles.featureRow}>
          <Ionicons name="card-outline" size={20} color={colors.primary} />
          <View>
            <Text style={[styles.featureText, { color: colors.foreground }]}>Test mode — no charge</Text>
            <Text style={[styles.smallNote, { color: colors.mutedForeground }]}>
              Payment integration coming soon. Orders are tracked locally.
            </Text>
          </View>
        </View>
      </View>

      {/* Estimated delivery */}
      <View style={[styles.deliveryBanner, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
        <Ionicons name="time-outline" size={16} color={colors.primary} />
        <Text style={[styles.deliveryText, { color: colors.primary }]}>
          Estimated delivery by {formatDeliveryDate(delivery.toISOString().slice(0, 10))}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: placing ? colors.border : colors.primary }]}
        onPress={placing ? undefined : onPlace}
        activeOpacity={0.85}
      >
        {placing ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.primaryForeground} />
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Place Order</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Step 4: Confirmation ─────────────────────────────────────────────────────

function ConfirmationStep({
  order,
  colors,
  onDone,
}: {
  order: PrintOrder;
  colors: ReturnType<typeof useColors>;
  onDone: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={[styles.stepContent, { alignItems: 'center' }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.successIcon, { backgroundColor: colors.primary + '18' }]}>
        <Ionicons name="checkmark-circle" size={56} color={colors.primary} />
      </View>
      <Text style={[styles.confTitle, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
        Order placed!
      </Text>
      <Text style={[styles.confSub, { color: colors.mutedForeground }]}>
        Your copy of{' '}
        <Text style={{ color: colors.foreground, fontFamily: 'Inter_500Medium' }}>{order.bookTitle}</Text>
        {' '}is on its way to the printer.
      </Text>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, width: '100%' }]}>
        <View style={styles.priceRow}>
          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Order ID</Text>
          <Text style={[styles.priceValue, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>
            #{order.id.slice(-8).toUpperCase()}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Status</Text>
          <Text style={[styles.priceValue, { color: '#FF9800', fontFamily: 'Inter_500Medium' }]}>Processing</Text>
        </View>
        {order.estimatedDelivery && (
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Est. delivery</Text>
            <Text style={[styles.priceValue, { color: colors.foreground }]}>
              {formatDeliveryDate(order.estimatedDelivery)}
            </Text>
          </View>
        )}
        <View style={styles.priceRow}>
          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Total charged</Text>
          <Text style={[styles.priceValue, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            {formatTotalCents(order.totalCents)}
          </Text>
        </View>
      </View>

      <Text style={[styles.confNote, { color: colors.mutedForeground }]}>
        You can track your order in Profile → Orders.
      </Text>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: colors.primary, width: '100%' }]}
        onPress={onDone}
        activeOpacity={0.85}
      >
        <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function OrderFlowContent() {
  const { monthKey: mk } = useLocalSearchParams<{ monthKey: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { placeOrder } = useOrders();
  const { getBook } = useDiary();

  const [step, setStep] = useState<Step>('preview');
  const [address, setAddress] = useState<Partial<ShippingAddress>>({ country: 'US' });
  const [placing, setPlacing] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<PrintOrder | null>(null);

  const monthKey = mk ?? '';
  const book = getBook(monthKey);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const stepTitles: Record<Step, string> = {
    preview: 'Print Your Book',
    address: 'Shipping Address',
    payment: 'Review & Pay',
    confirmation: 'Order Confirmed',
  };

  function handleBack() {
    if (step === 'preview') { router.back(); return; }
    if (step === 'address') { setStep('preview'); return; }
    if (step === 'payment') { setStep('address'); return; }
  }

  async function handlePlaceOrder() {
    if (!book) return;
    setPlacing(true);
    try {
      const order = await placeOrder(
        monthKey,
        monthLabel(monthKey),
        estimatedPages(monthKey),
        address as ShippingAddress,
      );
      setConfirmedOrder(order);
      setStep('confirmation');
    } catch (e) {
      Alert.alert('Error', 'Could not place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border }]}>
        {step !== 'confirmation' ? (
          <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          {stepTitles[step]}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {step !== 'confirmation' && <StepDots step={step} colors={colors} />}

      {step === 'preview' && (
        <PreviewStep monthKey={monthKey} colors={colors} onNext={() => setStep('address')} />
      )}
      {step === 'address' && (
        <AddressStep
          colors={colors}
          address={address}
          onChange={setAddress}
          onNext={() => setStep('payment')}
          onBack={() => setStep('preview')}
        />
      )}
      {step === 'payment' && (
        <PaymentStep
          colors={colors}
          monthKey={monthKey}
          address={address as ShippingAddress}
          onPlace={handlePlaceOrder}
          onBack={() => setStep('address')}
          placing={placing}
        />
      )}
      {step === 'confirmation' && confirmedOrder && (
        <ConfirmationStep
          order={confirmedOrder}
          colors={colors}
          onDone={() => router.replace('/(tabs)/profile' as any)}
        />
      )}
    </View>
  );
}

export default function OrderFlow() {
  return (
    <ProtectedScreen>
      <OrderFlowContent />
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, letterSpacing: 0.2 },
  stepDots: { flexDirection: 'row', gap: 6, alignSelf: 'center', paddingVertical: 14 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  stepContent: { padding: 20, gap: 16, paddingBottom: 40 },

  bookCard: {
    flexDirection: 'row', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden', height: 96,
  },
  bookSpine: { width: 12 },
  bookInfo: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, gap: 6 },
  bookTitle: { fontSize: 18, letterSpacing: 0.2 },
  bookMeta: { fontSize: 13, fontFamily: 'Inter_400Regular' },

  section: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
    gap: 2,
  },
  sectionLabel: {
    fontSize: 10, fontFamily: 'Inter_500Medium', letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 8,
  },

  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  featureText: { fontSize: 14, fontFamily: 'Inter_400Regular', flex: 1 },
  smallNote: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2, flexShrink: 1 },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  priceLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  priceValue: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4, paddingTop: 12 },
  totalLabel: { fontSize: 15 },
  totalValue: { fontSize: 15 },

  fieldWrap: { gap: 4 },
  fieldLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: 'Inter_400Regular',
  },
  halfRow: { flexDirection: 'row', gap: 0 },

  addressLine: { fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 2 },

  deliveryBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, padding: 12,
  },
  deliveryText: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 14,
    marginTop: 4,
  },
  primaryBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },

  successIcon: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  confTitle: { fontSize: 26, letterSpacing: 0.3, textAlign: 'center' },
  confSub: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22, paddingHorizontal: 12 },
  confNote: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: -8 },
});
