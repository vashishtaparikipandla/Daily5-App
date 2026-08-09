import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { useDiary } from '@/contexts/DiaryContext';

interface SectionItem {
  icon: string;
  label: string;
  route?: string;
  onPress?: () => void;
  destructive?: boolean;
}

interface Section {
  title?: string;
  items: SectionItem[];
}

export default function ProfileTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useApp();
  const { books, totalDays, totalMoments } = useDiary();

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 84 : 84);

  const lockedBooks = books.filter(b => b.locked).length;

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await signOut(); router.replace('/auth'); } },
    ]);
  }

  const sections: Section[] = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline', label: 'Edit Profile', route: '/profile/edit' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'notifications-outline', label: 'Notifications', route: '/profile/notifications' },
        { icon: 'color-palette-outline', label: 'Appearance', route: '/profile/appearance' },
      ],
    },
    {
      title: 'Data',
      items: [
        { icon: 'shield-outline', label: 'Data & Privacy', route: '/profile/privacy' },
        { icon: 'cube-outline', label: 'Orders', route: '/profile/orders' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help & About', route: '/profile/help' },
      ],
    },
    {
      items: [
        { icon: 'log-out-outline', label: 'Sign Out', onPress: handleSignOut, destructive: true },
      ],
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name */}
        <View style={styles.avatarBlock}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarLetter, { color: colors.primaryForeground }]}>
              {(user?.name ?? 'U')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
            {user?.name ?? 'You'}
          </Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { value: totalDays, label: 'Days' },
            { value: lockedBooks, label: 'Books' },
            { value: totalMoments, label: 'Moments' },
          ].map(s => (
            <View key={s.label} style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                {s.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Sections */}
        {sections.map((section, si) => (
          <View key={si} style={styles.section}>
            {section.title && (
              <Text style={[styles.sectionTitle, { color: colors.tertiary }]}>{section.title}</Text>
            )}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.sectionItem,
                    ii < section.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  ]}
                  onPress={item.onPress ?? (() => item.route && router.push(item.route as any))}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={item.destructive ? colors.destructive : colors.mutedForeground}
                  />
                  <Text style={[styles.itemLabel, { color: item.destructive ? colors.destructive : colors.foreground }]}>
                    {item.label}
                  </Text>
                  {!item.onPress && <Ionicons name="chevron-forward" size={16} color={colors.tertiary} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  avatarBlock: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 30, fontFamily: 'PlayfairDisplay_700Bold' },
  name: { fontSize: 22, letterSpacing: 0.2 },
  email: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  statsRow: {
    flexDirection: 'row', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24 },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  section: { gap: 6 },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_500Medium', letterSpacing: 0.8, textTransform: 'uppercase', paddingLeft: 4 },
  sectionCard: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sectionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  itemLabel: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
});
