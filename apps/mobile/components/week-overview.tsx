// Seven-day tide overview: per-day range with a neap↔spring bar, tappable to
// jump to that day. Helps plan ahead (springs = bigger range, stronger streams).

import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';
import { formatDay, ukDayStartFromYmd, ymdAddDays } from '@/lib/datetime';
import type { Station } from '@/lib/stations';
import { classifyTide, dayEvents, dayRange, tidalStats } from '@/lib/tide-day';

export function WeekOverview({
  station,
  fromYmd,
  selectedYmd,
  onSelectDay,
}: {
  station: Station;
  fromYmd: string;
  selectedYmd: string;
  onSelectDay: (ymd: string) => void;
}) {
  const palette = usePalette();
  const stats = tidalStats(station);

  const days = Array.from({ length: 7 }, (_, i) => {
    const ymd = ymdAddDays(fromYmd, i);
    const start = ukDayStartFromYmd(ymd);
    const events = dayEvents(station, start);
    const range = dayRange(events);
    const cls = classifyTide(range, stats);
    return { ymd, start, range, cls };
  });

  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <ThemedText type="defaultSemiBold">Next 7 days</ThemedText>
      {days.map((d) => {
        const selected = d.ymd === selectedYmd;
        const barColor =
          d.cls.label === 'Springs' ? palette.accent : d.cls.label === 'Neaps' ? palette.muted : palette.tint;
        return (
          <Pressable
            key={d.ymd}
            onPress={() => onSelectDay(d.ymd)}
            style={[
              styles.row,
              { borderColor: palette.border },
              selected && { backgroundColor: `${palette.tint}14`, borderRadius: 8 },
            ]}
          >
            <ThemedText style={[styles.day, selected && { fontWeight: '700' }]}>
              {formatDay(d.start)}
            </ThemedText>
            <View style={[styles.track, { backgroundColor: palette.border }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.round(d.cls.fraction * 100)}%`, backgroundColor: barColor },
                ]}
              />
            </View>
            <ThemedText style={[styles.range, { color: palette.muted }]}>
              {d.range.toFixed(1)} m
            </ThemedText>
            <ThemedText style={[styles.tag, { color: barColor }]}>{d.cls.label}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 4 },
  day: { width: 92, fontSize: 13 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  range: { width: 48, textAlign: 'right', fontSize: 13 },
  tag: { width: 64, textAlign: 'right', fontSize: 12, fontWeight: '600' },
});
