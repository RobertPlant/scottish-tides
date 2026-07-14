import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { DayNav } from '@/components/day-nav';
import { Note } from '@/components/note';
import { StreamCurve } from '@/components/stream-curve';
import { ThemedText } from '@/components/themed-text';
import { useDayNav } from '@/hooks/use-day-nav';
import { usePalette } from '@/hooks/use-theme-color';
import { formatTime } from '@/lib/datetime';
import { stationById } from '@/lib/stations';
import { predictStreamDay, RACES, raceById } from '@/lib/streams';

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return RACES.map((r) => ({ id: r.id }));
}

export default function RaceDetail() {
  const palette = usePalette();
  const { id, d } = useLocalSearchParams<{ id: string; d?: string }>();
  const race = raceById(id) ?? RACES[0];
  const ref = stationById(race.referenceStationId);

  const now = useMemo(() => new Date(), []);
  const nav = useDayNav({ initialYmd: d, syncUrl: true });
  const { dayStart, isToday } = nav;

  const stream = useMemo(() => predictStreamDay(race, dayStart), [race, dayStart]);

  return (
    <>
      <Stack.Screen options={{ title: race.name }} />
      <ScrollView
        contentContainerStyle={styles.content}
        style={{ backgroundColor: palette.background }}
      >
        <View>
          <ThemedText type="title">{race.name}</ThemedText>
          <ThemedText type="caption" style={{ color: palette.muted }}>
            {race.area}
          </ThemedText>
        </View>

        <Note tone="warn">
          <ThemedText type="caption" style={{ color: palette.low, fontWeight: '700' }}>
            ⚠ {race.warning}
          </ThemedText>
        </Note>

        <DayNav nav={nav}>
          <ThemedText type="caption" style={{ color: palette.muted }}>
            peak ~{stream.peakRate.toFixed(1)} kn
          </ThemedText>
        </DayNav>

        <Card gap={10}>
          <StreamCurve
            samples={stream.samples}
            slacks={stream.slacks}
            now={isToday ? now : undefined}
            floodName={race.floodName}
            ebbName={race.ebbName}
            height={210}
          />
        </Card>

        <Card gap={10}>
          <ThemedText type="defaultSemiBold">Slack water (best transit)</ThemedText>
          {stream.slacks.length === 0 ? (
            <ThemedText style={{ color: palette.muted }}>—</ThemedText>
          ) : (
            <ThemedText style={{ color: palette.tint }}>
              {stream.slacks.map((s) => formatTime(s)).join('   ·   ')}
            </ThemedText>
          )}

          <ThemedText type="defaultSemiBold" style={{ marginTop: 8 }}>
            Peak streams
          </ThemedText>
          {stream.peaks.map((p) => (
            <View key={p.time.toISOString()} style={styles.peakRow}>
              <View
                style={[styles.dot, { backgroundColor: p.rate > 0 ? palette.high : palette.low }]}
              />
              <ThemedText style={{ flex: 1 }}>{p.dirName}</ThemedText>
              <ThemedText style={styles.peakTime}>{formatTime(p.time)}</ThemedText>
              <ThemedText style={[styles.peakRate, { color: palette.muted }]}>
                {Math.abs(p.rate).toFixed(1)} kn
              </ThemedText>
            </View>
          ))}
        </Card>

        <Note>
          <ThemedText type="caption" style={{ color: palette.muted }}>
            Timed off HW/LW at {ref?.name ?? 'the reference port'}; rate scaled by today's
            spring/neap ({Math.round(stream.springNeapFraction * 100)}% towards springs).
          </ThemedText>
          <ThemedText type="caption" style={{ color: palette.muted }}>
            {race.source} Model only — slack/direction approximate. Not for navigation; check the
            tidal stream atlas and pilot.
          </ThemedText>
        </Note>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  peakRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  peakTime: { width: 64, textAlign: 'right' },
  peakRate: { width: 56, textAlign: 'right' },
});
