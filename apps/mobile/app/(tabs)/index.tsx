import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { NowNext } from '@/components/now-next';
import { ThemedText } from '@/components/themed-text';
import { TideCurve } from '@/components/tide-curve';
import { TideTable } from '@/components/tide-table';
import { usePalette } from '@/hooks/use-theme-color';
import { formatLongDay, ukStartOfDay } from '@/lib/datetime';
import { useSelectedStation } from '@/lib/selected-station';
import { STATIONS, stationById } from '@/lib/stations';
import { dayEvents, dayHeightSeries, nowState } from '@/lib/tide-day';

export default function HomeScreen() {
  const palette = usePalette();
  const router = useRouter();
  const { stationId, setStationId, isFavourite } = useSelectedStation();
  const station = stationById(stationId) ?? STATIONS[0];

  // Favourite stations first in the chip row.
  const chipStations = useMemo(
    () => [...STATIONS].sort((a, b) => Number(isFavourite(b.id)) - Number(isFavourite(a.id))),
    [isFavourite],
  );

  // Re-render each minute so "now" stays live.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const dayStart = useMemo(() => ukStartOfDay(now), [now]);
  const state = useMemo(() => nowState(station, now), [station, now]);
  const events = useMemo(() => dayEvents(station, dayStart), [station, dayStart]);
  const series = useMemo(() => dayHeightSeries(station, dayStart), [station, dayStart]);

  return (
    <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: palette.background }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {chipStations.map((s) => {
          const active = s.id === station.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => setStationId(s.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? palette.tint : palette.surface,
                  borderColor: active ? palette.tint : palette.border,
                },
              ]}
            >
              <ThemedText
                style={{ color: active ? palette.background : palette.text, fontWeight: '600' }}
              >
                {s.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <NowNext station={station} state={state} now={now} />

      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <ThemedText type="defaultSemiBold">{formatLongDay(now)}</ThemedText>
        <TideCurve series={series} events={events} now={now} />
        <TideTable events={events} />
      </View>

      <Pressable
        onPress={() => router.push({ pathname: '/station/[id]', params: { id: station.id } })}
        style={[styles.button, { borderColor: palette.border }]}
      >
        <ThemedText style={{ color: palette.accent, fontWeight: '600' }}>
          Other days & full curve →
        </ThemedText>
      </Pressable>

      <ThemedText type="caption" style={[styles.disclaimer, { color: palette.muted }]}>
        Heights are astronomical predictions vs {station.data.datum?.replace('The data refer to ', '') ?? 'chart datum'},
        and do not include weather (surge). These are water levels, not tidal streams — never plan a
        race transit (e.g. Pentland Firth, Falls of Lora) from these tables.
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  chips: { gap: 8, paddingVertical: 2 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  button: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disclaimer: { lineHeight: 18 },
});
