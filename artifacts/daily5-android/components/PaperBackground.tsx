import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface Props {
  children: React.ReactNode;
  showMarginLine?: boolean;
  marginLineX?: number;
}

/** Warm paper-textured background with optional left margin rule line. */
export function PaperBackground({ children, showMarginLine = true, marginLineX = 52 }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {showMarginLine && (
        <View
          style={[
            styles.marginLine,
            { left: marginLineX, backgroundColor: colors.marginLine },
          ]}
          pointerEvents="none"
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  marginLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    zIndex: 0,
  },
});
