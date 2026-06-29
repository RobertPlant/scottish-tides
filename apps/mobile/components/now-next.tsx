// "Right now" summary card: current level, rising/falling, and the next couple
// of turning points.

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';
import { formatRelative, formatTime } from '@/lib/datetime';
import type { Station } from '@/lib/stations';
import type { NowState } from '@/lib/tide-day';

export function NowNext({
  station,
  state,
  now,
  showName = true,
}: {
  station: Station;
  state: NowState;
  now: Date;
  showName?: boolean;
}) {
  const palette = usePalette();
  const { heightNow, rising, next, afterNext } = state;
  const trendColor = rising ? palette.high : palette.low;

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          {showName ? (
            <>
              <ThemedText type="subtitle">{station.name}</ThemedText>
              {station.subtitle ? (
                <ThemedText type="caption" style={{ color: palette.muted }}>
                  {station.subtitle}
                </ThemedText>
              ) : null}
            </>
          ) : (
            <ThemedText type="caption" style={{ color: palette.muted }}>
              Right now
            </ThemedText>
          )}
        </View>
        <View style={[styles.trendPill, { backgroundColor: trendColor }]}>
          <ThemedText style={styles.trendText}>{rising ? '▲ Rising' : '▼ Falling'}</ThemedText>
        </View>
      </View>

      <View style={styles.levelRow}>
        <ThemedText style={styles.level}>{heightNow.toFixed(2)}</ThemedText>
        <ThemedText style={[styles.levelUnit, { color: palette.muted }]}>m now</ThemedText>
      </View>

      {next ? (
        <View style={styles.nextRow}>
          <View
            style={[
              styles.dot,
              { backgroundColor: next.type === 'high' ? palette.high : palette.low },
            ]}
          />
          <ThemedText type="defaultSemiBold">
            {next.type === 'high' ? 'High' : 'Low'} {next.height.toFixed(2)} m
          </ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            {formatTime(next.time)} · {formatRelative(next.time, now)}
          </ThemedText>
        </View>
      ) : null}

      {afterNext ? (
        <View style={styles.nextRow}>
          <View
            style={[
              styles.dot,
              { backgroundColor: afterNext.type === 'high' ? palette.high : palette.low },
            ]}
          />
          <ThemedText style={{ color: palette.muted }}>
            then {afterNext.type === 'high' ? 'High' : 'Low'} {afterNext.height.toFixed(2)} m at{' '}
            {formatTime(afterNext.time)}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  trendPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  trendText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  levelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  level: { fontSize: 48, lineHeight: 52, fontWeight: '800' },
  levelUnit: { fontSize: 18 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
