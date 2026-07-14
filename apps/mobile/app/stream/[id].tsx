import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { StreamCurve } from '@/components/stream-curve';
import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';
import { formatLongDay, formatTime, ukDayStartFromYmd, ymdAddDays, ymdInUk } from '@/lib/datetime';
import { stationById } from '@/lib/stations';
import { predictStreamDay, RACES, raceById } from '@/lib/streams';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return RACES.map((r) => ({ id: r.id }));
}

export default function RaceDetail() {
  const palette = usePalette();
  const router = useRouter();
  const { id, d } = useLocalSearchParams<{ id: string; d?: string }>();
  const race = raceById(id) ?? RACES[0];
  const ref = stationById(race.referenceStationId);

  const now = useMemo(() => new Date(), []);
  const todayYmd = useMemo(() => ymdInUk(now), [now]);
  const [ymd, setYmd] = useState(() => (d && YMD_RE.test(d) ? d : ymdInUk(new Date())));
  const dayStart = useMemo(() => ukDayStartFromYmd(ymd), [ymd]);
  const isToday = ymd === todayYmd;

  const minYmd = useMemo(() => ymdAddDays(todayYmd, -730), [todayYmd]);
  const maxYmd = useMemo(() => ymdAddDays(todayYmd, 730), [todayYmd]);

  const updateYmd = useCallback(
    (next: string) => {
      setYmd(next);
      router.setParams({ d: next });
    },
    [router],
  );

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

        <View
          style={[styles.warn, { borderColor: palette.low, backgroundColor: `${palette.low}14` }]}
        >
          <ThemedText type="caption" style={{ color: palette.low, fontWeight: '700' }}>
            ⚠ {race.warning}
          </ThemedText>
        </View>

        <View style={styles.navRow}>
          <Pressable
            onPress={() => updateYmd(ymdAddDays(ymd, -1))}
            style={[styles.navButton, { borderColor: palette.border }]}
          >
            <ThemedText style={{ color: palette.accent }}>‹ Prev</ThemedText>
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.navLabel}>
            {formatLongDay(dayStart)}
          </ThemedText>
          <Pressable
            onPress={() => updateYmd(ymdAddDays(ymd, 1))}
            style={[styles.navButton, { borderColor: palette.border }]}
          >
            <ThemedText style={{ color: palette.accent }}>Next ›</ThemedText>
          </Pressable>
        </View>

        <View style={styles.pickerRow}>
          <DateField value={ymd} onChange={updateYmd} min={minYmd} max={maxYmd} />
          {!isToday ? (
            <Pressable onPress={() => updateYmd(todayYmd)} style={styles.todayLink}>
              <ThemedText style={{ color: palette.accent }}>Today</ThemedText>
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }} />
          <ThemedText type="caption" style={{ color: palette.muted }}>
            peak ~{stream.peakRate.toFixed(1)} kn
          </ThemedText>
        </View>

        <View
          style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <StreamCurve
            samples={stream.samples}
            slacks={stream.slacks}
            now={isToday ? now : undefined}
            floodName={race.floodName}
            ebbName={race.ebbName}
            height={210}
          />
        </View>

        <View
          style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
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
        </View>

        <View style={[styles.info, { borderColor: palette.border }]}>
          <ThemedText type="caption" style={{ color: palette.muted }}>
            Timed off HW/LW at {ref?.name ?? 'the reference port'}; rate scaled by today's
            spring/neap ({Math.round(stream.springNeapFraction * 100)}% towards springs).
          </ThemedText>
          <ThemedText type="caption" style={{ color: palette.muted }}>
            {race.source} Model only — slack/direction approximate. Not for navigation; check the
            tidal stream atlas and pilot.
          </ThemedText>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  warn: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  navButton: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  navLabel: { flex: 1, textAlign: 'center' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  todayLink: { paddingVertical: 4, paddingHorizontal: 4 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10 },
  peakRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  peakTime: { width: 64, textAlign: 'right' },
  peakRate: { width: 56, textAlign: 'right' },
  info: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 6 },
});
