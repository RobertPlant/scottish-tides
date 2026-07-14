// Small bordered note block. `info` = quiet caption box (border only); `warn` =
// a low-water-coloured caution box (e.g. the tidal-stream safety warnings).

import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { usePalette } from '@/hooks/use-theme-color';

export function Note({
  children,
  tone = 'info',
  gap = 6,
  style,
}: {
  children: ReactNode;
  tone?: 'info' | 'warn';
  gap?: number;
  style?: ViewStyle | ViewStyle[];
}) {
  const palette = usePalette();
  const toneStyle: ViewStyle =
    tone === 'warn'
      ? { borderColor: palette.low, backgroundColor: `${palette.low}14` }
      : { borderColor: palette.border };
  return <View style={[styles.note, toneStyle, { gap }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  note: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
});
