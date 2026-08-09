import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { ProtectedScreen } from '@/components/ProtectedScreen';

function EditProfileContent() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useApp();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    setSaving(true);
    await updateUser({ name: name.trim() });
    setSaving(false);
    router.back();
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveBtn, { color: colors.primary, opacity: saving ? 0.5 : 1 }]}>Save</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Display name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.tertiary}
          autoFocus
        />
        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 16 }]}>Email</Text>
        <View style={[styles.emailDisplay, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.emailText, { color: colors.mutedForeground }]}>{user?.email}</Text>
        </View>
        <Text style={[styles.hint, { color: colors.tertiary }]}>Email changes require re-verification.</Text>
      </View>
    </View>
  );
}

export default function EditProfile() {
  return (
    <ProtectedScreen>
      <EditProfileContent />
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
  saveBtn: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  form: { padding: 20, gap: 8 },
  label: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 0.5, textTransform: 'uppercase' },
  input: { height: 48, borderRadius: 10, paddingHorizontal: 14, fontSize: 15, fontFamily: 'Inter_400Regular', borderWidth: 1 },
  emailDisplay: { height: 48, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1 },
  emailText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});
