// "When is the water above/below X m" — windows for slipways, drying rocks,
// causeways. Stepper + above/below toggle, all client-side from the day's curve.

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';
import { formatTime } from '@/lib/datetime';
import type { Station } from '@/lib/stations';
import { dayHeightSeries, thresholdWindows } from '@/lib/tide-day';

function duration(start: Date, end: Date): string {
  const mins = Math.round((end.getTime() - start.getTime()) / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function ThresholdTool({ station, dayStart }: { station: Station; dayStart: Date }) {
  const palette = usePalette();
  const series = useMemo(() => dayHeightSeries(station, dayStart, 5), [station, dayStart]);
  const { min, max } = useMemo(() => {
    const hs = series.map((s) => s.height);
    return { min: Math.min(...hs), max: Math.max(...hs) };
  }, [series]);

  const [threshold, setThreshold] = useState(() => Math.round(((min + max) / 2) * 10) / 10);
  const [mode, setMode] = useState<'above' | 'below'>('above');

  const lo = Math.floor(min * 10) / 10;
  const hi = Math.ceil(max * 10) / 10;
  const t = Math.min(Math.max(threshold, lo), hi);
  const windows = useMemo(() => thresholdWindows(series, t, mode), [series, t, mode]);

  const step = (d: number) => setThreshold((v) => Math.round((Math.min(Math.max(v + d, lo), hi)) * 10) / 10);

  const ModeButton = ({ value, label }: { value: 'above' | 'below'; label: string }) => {
    const active = mode === value;
    return (
      <Pressable
        onPress={() => setMode(value)}
        style={[
          styles.modeBtn,
          { borderColor: palette.border, backgroundColor: active ? palette.tint : 'transparent' },
        ]}
      >
        <ThemedText style={{ color: active ? palette.background : palette.text, fontWeight: '600' }}>
          {label}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <ThemedText type="defaultSemiBold">Water level windows</ThemedText>

      <View style={styles.controls}>
        <View style={styles.modeRow}>
          <ModeButton value="above" label="Above" />
          <ModeButton value="below" label="Below" />
        </View>
        <View style={styles.stepper}>
          <Pressable onPress={() => step(-0.1)} style={[styles.stepBtn, { borderColor: palette.border }]}>
            <ThemedText style={styles.stepTxt}>−</ThemedText>
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.thresholdTxt}>
            {t.toFixed(1)} m
          </ThemedText>
          <Pressable onPress={() => step(0.1)} style={[styles.stepBtn, { borderColor: palette.border }]}>
            <ThemedText style={styles.stepTxt}>+</ThemedText>
          </Pressable>
        </View>
      </View>

      {windows.length === 0 ? (
        <ThemedText style={{ color: palette.muted }}>
          Water is never {mode} {t.toFixed(1)} m on this day.
        </ThemedText>
      ) : (
        windows.map((w) => (
          <View key={w.start.toISOString()} style={styles.windowRow}>
            <ThemedText style={styles.windowTime}>
              {formatTime(w.start)} – {formatTime(w.end)}
            </ThemedText>
            <ThemedText style={{ color: palette.muted }}>{duration(w.start, w.end)}</ThemedText>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: { borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 7 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTxt: { fontSize: 20, fontWeight: '600' },
  thresholdTxt: { width: 56, textAlign: 'center', fontSize: 16 },
  windowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  windowTime: { fontSize: 15 },
});
