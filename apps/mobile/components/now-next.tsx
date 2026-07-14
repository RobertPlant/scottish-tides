// "Right now" summary card: current level and rising/falling. The upcoming
// high/low schedule lives in the day table just below (with countdowns), so we
// don't repeat it here.

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';
import type { Station } from '@/lib/stations';
import type { NowState } from '@/lib/tide-day';

export function NowNext({
  station,
  state,
  showName = true,
}: {
  station: Station;
  state: NowState;
  showName?: boolean;
}) {
  const palette = usePalette();
  const { heightNow, rising } = state;
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
});
