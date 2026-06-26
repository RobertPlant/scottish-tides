import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TideCurve } from '@/components/tide-curve';
import { TideTable } from '@/components/tide-table';
import { usePalette } from '@/hooks/use-theme-color';
import { addDays, formatLongDay, ukStartOfDay } from '@/lib/datetime';
import { STATIONS, stationById } from '@/lib/stations';
import { dayEvents, dayHeightSeries } from '@/lib/tide-day';

export default function StationDetail() {
  const palette = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const station = stationById(id) ?? STATIONS[0];

  const now = useMemo(() => new Date(), []);
  const [offset, setOffset] = useState(0);
  const dayStart = useMemo(() => addDays(ukStartOfDay(now), offset), [now, offset]);

  const events = useMemo(() => dayEvents(station, dayStart), [station, dayStart]);
  const series = useMemo(() => dayHeightSeries(station, dayStart), [station, dayStart]);
  const isToday = offset === 0;

  return (
    <>
      <Stack.Screen options={{ title: station.name }} />
      <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: palette.background }}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">{station.name}</ThemedText>
            {station.subtitle ? (
              <ThemedText type="caption" style={{ color: palette.muted }}>
                {station.subtitle}
              </ThemedText>
            ) : null}
          </View>
        </View>

        <View style={styles.navRow}>
          <Pressable
            onPress={() => setOffset((o) => o - 1)}
            style={[styles.navButton, { borderColor: palette.border }]}
          >
            <ThemedText style={{ color: palette.accent }}>‹ Prev</ThemedText>
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.navLabel}>
            {formatLongDay(dayStart)}
          </ThemedText>
          <Pressable
            onPress={() => setOffset((o) => o + 1)}
            style={[styles.navButton, { borderColor: palette.border }]}
          >
            <ThemedText style={{ color: palette.accent }}>Next ›</ThemedText>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <TideCurve series={series} events={events} now={isToday ? now : undefined} height={220} />
          <TideTable events={events} />
        </View>

        {!isToday ? (
          <Pressable onPress={() => setOffset(0)} style={styles.todayLink}>
            <ThemedText style={{ color: palette.accent }}>Back to today</ThemedText>
          </Pressable>
        ) : null}

        <View style={[styles.info, { borderColor: palette.border }]}>
          <ThemedText type="caption" style={{ color: palette.muted }}>
            {station.standardPort
              ? 'Standard port — predicted directly from its own gauge.'
              : `Secondary port — derived from ${station.shift?.based_on ?? 'a nearby gauge'} by a constant Admiralty offset.`}
          </ThemedText>
          {station.data.obs_span ? (
            <ThemedText type="caption" style={{ color: palette.muted }}>
              Fitted from gauge data {station.data.obs_span[0]} → {station.data.obs_span[1]}.
            </ThemedText>
          ) : null}
          <ThemedText type="caption" style={{ color: palette.muted }}>
            Heights vs {station.data.datum?.replace('The data refer to ', '') ?? 'chart datum'}.
            Astronomical only (no surge). Water levels, not streams.
          </ThemedText>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  navButton: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 8 },
  navLabel: { flex: 1, textAlign: 'center' },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  todayLink: { alignItems: 'center', paddingVertical: 4 },
  info: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 6 },
});
