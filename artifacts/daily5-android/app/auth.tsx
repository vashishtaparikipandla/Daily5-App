import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { router } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

// Set these in your environment for real Google Sign-In:
// EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID — from Google Cloud Console
// EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID      — from Google Cloud Console
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

export default function AuthScreen() {
  const { signIn } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleSuccess(response.authentication?.accessToken ?? '');
    } else if (response?.type === 'error') {
      setError('Google sign-in failed. Try demo mode below.');
      setLoading(false);
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setLoading(false);
    }
  }, [response]);

  async function handleGoogleSuccess(token: string) {
    try {
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = await res.json();
      // Pass the access token so AppContext can persist it for server-side auth
      await signIn(
        { name: user.name || 'User', email: user.email || '', avatar: user.picture },
        token,
      );
      router.replace('/biometric-setup');
    } catch {
      setError('Could not fetch profile. Try demo mode below.');
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setLoading(true);
    if (!ANDROID_CLIENT_ID && !WEB_CLIENT_ID) {
      setError('Google client ID not configured. Use demo mode below.');
      setLoading(false);
      return;
    }
    await promptAsync();
  }

  async function handleDemo() {
    setError('');
    setLoading(true);
    await signIn({ name: 'Vashishta', email: 'demo@daily5.app' });
    router.replace('/biometric-setup');
  }

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: botPad }]}>
      <View style={styles.logoArea}>
        <Text style={[styles.appName, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          Daily 5
        </Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>your days, remembered</Text>
      </View>

      <View style={styles.actions}>
        {!!error && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        )}

        <TouchableOpacity
          style={[styles.googleBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleGoogle}
          disabled={loading || !request}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#4285F4" />
              <Text style={[styles.googleBtnText, { color: colors.foreground }]}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]}>
          <View style={[styles.divLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.divText, { color: colors.tertiary }]}>or</Text>
          <View style={[styles.divLine, { backgroundColor: colors.border }]} />
        </View>

        <TouchableOpacity
          style={[styles.demoBtn, { borderColor: colors.border }]}
          onPress={handleDemo}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={[styles.demoBtnText, { color: colors.mutedForeground }]}>Continue with demo account</Text>
        </TouchableOpacity>

        <Text style={[styles.fine, { color: colors.tertiary }]}>
          Your diary is stored locally on this device. Nothing is shared without your permission.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 28 },
  logoArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  appName: { fontSize: 40, letterSpacing: 0.5 },
  tagline: { fontSize: 14, fontFamily: 'Inter_400Regular', letterSpacing: 1, fontStyle: 'italic' },
  actions: { paddingBottom: 24, gap: 12 },
  errorText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 52, borderRadius: 12, borderWidth: 1,
  },
  googleBtnText: { fontSize: 16, fontFamily: 'Inter_500Medium' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'transparent' },
  divLine: { flex: 1, height: 1 },
  divText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  demoBtn: { height: 44, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  demoBtnText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  fine: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 16 },
});
