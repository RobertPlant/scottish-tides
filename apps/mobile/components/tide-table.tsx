// High/low water list for a day.

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';
import { formatTime } from '@/lib/datetime';
import type { TideEvent } from '@/lib/tides';

export function TideTable({ events }: { events: TideEvent[] }) {
  const palette = usePalette();

  if (events.length === 0) {
    return <ThemedText style={{ color: palette.muted }}>No tides for this day.</ThemedText>;
  }

  return (
    <View>
      {events.map((e) => {
        const color = e.type === 'high' ? palette.high : palette.low;
        return (
          <View key={e.time.toISOString()} style={[styles.row, { borderColor: palette.border }]}>
            <View style={styles.left}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <ThemedText type="defaultSemiBold">
                {e.type === 'high' ? 'High water' : 'Low water'}
              </ThemedText>
            </View>
            <ThemedText style={styles.time}>{formatTime(e.time)}</ThemedText>
            <ThemedText style={[styles.height, { color: palette.muted }]}>
              {e.height.toFixed(2)} m
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  time: { width: 64, textAlign: 'right' },
  height: { width: 64, textAlign: 'right' },
});
