import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, FlatList, Dimensions, Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import { router } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width: SW } = Dimensions.get('window');

const SLIDES = [
  { title: 'Life is short.', body: 'You have roughly 4,000 weeks on earth. This app exists to help you notice the ones you\'re living.' },
  { title: 'Choose five.', body: 'Each evening, pick five moments from the day. Not the big ones — the real ones. They\'re what you\'ll remember.' },
  { title: 'Even hard days.', body: 'A difficult moment logged is still a moment that happened. This isn\'t a highlight reel.' },
  { title: 'Your book.', body: 'Every month becomes a little book — printed or kept on your phone. A record, not a performance.' },
];

function LifeGrid({ livedWeeks }: { livedWeeks: number }) {
  const colors = useColors();
  const DOT = 3; const GAP = 1; const STEP = DOT + GAP;
  const COLS = 52; const ROWS = 80;
  const rects = [];
  for (let i = 0; i < ROWS * COLS; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    rects.push(
      <Rect key={i} x={col * STEP} y={row * STEP} width={DOT} height={DOT} rx={0.8}
        fill={i < livedWeeks ? colors.primary : colors.border} />
    );
  }
  return <Svg width={COLS * STEP} height={ROWS * STEP}>{rects}</Svg>;
}

export default function OnboardingScreen() {
  const { completeOnboarding } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState(0);
  const [dob, setDob] = useState('');
  const [dobError, setDobError] = useState('');
  const [recalledDays, setRecalledDays] = useState<number | null>(null);
  const [livedWeeks, setLivedWeeks] = useState(0);
  const [lifeRevealed, setLifeRevealed] = useState(false);
  const [slide, setSlide] = useState(0);
  const slideRef = useRef<FlatList>(null);

  const fadeVal = useSharedValue(1);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeVal.value }));

  function transition(next: number) {
    fadeVal.value = withTiming(0, { duration: 180 }, () => {
      fadeVal.value = withTiming(1, { duration: 280 });
    });
    setTimeout(() => setPhase(next), 180);
  }

  function parseDob(s: string): Date | null {
    // Expect YYYY-MM-DD or YYYY/MM/DD
    const clean = s.replace(/\//g, '-');
    const d = new Date(clean + 'T12:00:00');
    if (isNaN(d.getTime())) return null;
    if (d.getFullYear() < 1900 || d > new Date()) return null;
    return d;
  }

  function handleDobContinue() {
    const date = parseDob(dob);
    if (!date) { setDobError('Enter a valid date (YYYY-MM-DD)'); return; }
    const weeks = Math.floor((Date.now() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
    setLivedWeeks(Math.min(weeks, 4160));
    setDobError('');
    transition(1);
  }

  function handleRecall(n: number) {
    Haptics.selectionAsync();
    setRecalledDays(n);
  }

  async function handleStart() {
    await completeOnboarding();
    router.replace('/auth');
  }

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === 'web' ? 34 : 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: botPad }]}>
      <Animated.View style={[styles.content, fadeStyle]}>

        {/* Phase 0 — DOB */}
        {phase === 0 && (
          <View style={styles.phase}>
            <Text style={[styles.heading, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
              When were you born?
            </Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              We'll show you something honest about time.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: dobError ? colors.destructive : colors.border }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.tertiary}
              value={dob}
              onChangeText={t => { setDob(t); setDobError(''); }}
              keyboardType="numeric"
              maxLength={10}
              autoFocus
            />
            {!!dobError && <Text style={[styles.error, { color: colors.destructive }]}>{dobError}</Text>}
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, opacity: dob.length < 8 ? 0.5 : 1 }]}
              onPress={handleDobContinue} disabled={dob.length < 8}
            >
              <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Phase 1 — Recalled days */}
        {phase === 1 && (
          <View style={styles.phase}>
            <Text style={[styles.heading, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
              How many days do you remember from last week?
            </Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>Be honest.</Text>
            <View style={styles.chips}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => handleRecall(n)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: recalledDays === n ? colors.primary : colors.muted,
                      borderColor: recalledDays === n ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: recalledDays === n ? colors.primaryForeground : colors.foreground }]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {recalledDays !== null && (
              <Text style={[styles.sub, { color: colors.mutedForeground, marginTop: 8 }]}>
                {recalledDays <= 2
                  ? "That's honest. Most people can't either."
                  : recalledDays <= 4
                  ? 'Better than average. Still a lot that faded.'
                  : 'That\'s exceptional. This will make it permanent.'}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, opacity: recalledDays === null ? 0.4 : 1, marginTop: 24 }]}
              onPress={() => transition(2)} disabled={recalledDays === null}
            >
              <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Show me</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Phase 2 — Life viz */}
        {phase === 2 && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.lifePhase}>
            <Text style={[styles.heading, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
              Your life in weeks
            </Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              Each dot is one week. The orange ones are already behind you.
            </Text>
            <View style={styles.gridWrap}>
              <LifeGrid livedWeeks={livedWeeks} />
            </View>
            <Text style={[styles.sub, { color: colors.mutedForeground, marginTop: 16 }]}>
              {livedWeeks} weeks lived. {Math.max(0, 4160 - livedWeeks)} ahead.
            </Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }]}
              onPress={() => transition(3)}
            >
              <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Got it</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Phase 3 — Carousel */}
        {phase === 3 && (
          <View style={styles.carousel}>
            <FlatList
              ref={slideRef}
              data={SLIDES}
              horizontal pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEnabled={false}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <View style={[styles.slide, { width: SW - 48 }]}>
                  <Text style={[styles.slideTitle, { color: colors.foreground, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.slideBody, { color: colors.mutedForeground }]}>{item.body}</Text>
                </View>
              )}
            />
            <View style={styles.pips}>
              {SLIDES.map((_, i) => (
                <View key={i} style={[styles.pip, { backgroundColor: i === slide ? colors.primary : colors.border }]} />
              ))}
            </View>
            <View style={styles.slideNav}>
              {slide < SLIDES.length - 1 ? (
                <>
                  <TouchableOpacity onPress={handleStart}>
                    <Text style={[styles.skip, { color: colors.tertiary }]}>Skip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]}
                    onPress={() => {
                      const next = slide + 1;
                      setSlide(next);
                      slideRef.current?.scrollToIndex({ index: next, animated: true });
                    }}
                  >
                    <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Next</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]} onPress={handleStart}>
                  <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Get Started</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28 },
  phase: { flex: 1, justifyContent: 'center', gap: 16 },
  heading: { fontSize: 28, lineHeight: 36, letterSpacing: 0.2 },
  sub: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  input: {
    height: 52, borderRadius: 12, paddingHorizontal: 16,
    fontSize: 17, fontFamily: 'Inter_400Regular',
    borderWidth: 1, marginTop: 8,
  },
  error: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  btn: {
    height: 52, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  btnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  chip: {
    width: 56, height: 56, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  chipText: { fontSize: 20, fontFamily: 'Inter_600SemiBold' },
  lifePhase: { alignItems: 'center', paddingVertical: 20, gap: 16 },
  gridWrap: { alignItems: 'center' },
  carousel: { flex: 1, justifyContent: 'center', gap: 20 },
  slide: { gap: 14 },
  slideTitle: { fontSize: 28, letterSpacing: 0.2 },
  slideBody: { fontSize: 16, fontFamily: 'Inter_400Regular', lineHeight: 24 },
  pips: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  pip: { width: 6, height: 6, borderRadius: 3 },
  slideNav: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  skip: { fontSize: 15, fontFamily: 'Inter_400Regular' },
});
