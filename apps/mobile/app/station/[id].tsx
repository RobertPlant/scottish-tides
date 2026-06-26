import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { SunMoonCard } from '@/components/sun-moon-card';
import { ThemedText } from '@/components/themed-text';
import { ThresholdTool } from '@/components/threshold-tool';
import { TideCurve } from '@/components/tide-curve';
import { TideTable } from '@/components/tide-table';
import { WeekOverview } from '@/components/week-overview';
import { usePalette } from '@/hooks/use-theme-color';
import { formatLongDay, ukDayStartFromYmd, ymdAddDays, ymdInUk } from '@/lib/datetime';
import { STATIONS, stationById } from '@/lib/stations';
import { classifyTide, dayEvents, dayHeightSeries, dayRange, tidalStats } from '@/lib/tide-day';

// Pre-render one static HTML page per station so deep links like
// /station/oban survive a hard refresh on GitHub Pages.
export async function generateStaticParams(): Promise<{ id: string }[]> {
  return STATIONS.map((s) => ({ id: s.id }));
}

export default function StationDetail() {
  const palette = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const station = stationById(id) ?? STATIONS[0];

  const now = useMemo(() => new Date(), []);
  const todayYmd = useMemo(() => ymdInUk(now), [now]);
  const [ymd, setYmd] = useState(todayYmd);
  const dayStart = useMemo(() => ukDayStartFromYmd(ymd), [ymd]);

  const minYmd = useMemo(() => ymdAddDays(todayYmd, -730), [todayYmd]);
  const maxYmd = useMemo(() => ymdAddDays(todayYmd, 730), [todayYmd]);

  const events = useMemo(() => dayEvents(station, dayStart), [station, dayStart]);
  const series = useMemo(() => dayHeightSeries(station, dayStart), [station, dayStart]);
  const isToday = ymd === todayYmd;

  const tideClass = useMemo(() => {
    const stats = tidalStats(station);
    return classifyTide(dayRange(events), stats);
  }, [station, events]);
  const range = dayRange(events);
  const classColor =
    tideClass.label === 'Springs' ? palette.accent : tideClass.label === 'Neaps' ? palette.muted : palette.tint;

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
            onPress={() => setYmd((d) => ymdAddDays(d, -1))}
            style={[styles.navButton, { borderColor: palette.border }]}
          >
            <ThemedText style={{ color: palette.accent }}>‹ Prev</ThemedText>
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.navLabel}>
            {formatLongDay(dayStart)}
          </ThemedText>
          <Pressable
            onPress={() => setYmd((d) => ymdAddDays(d, 1))}
            style={[styles.navButton, { borderColor: palette.border }]}
          >
            <ThemedText style={{ color: palette.accent }}>Next ›</ThemedText>
          </Pressable>
        </View>

        <View style={styles.pickerRow}>
          <DateField value={ymd} onChange={setYmd} min={minYmd} max={maxYmd} />
          {!isToday ? (
            <Pressable onPress={() => setYmd(todayYmd)} style={styles.todayLink}>
              <ThemedText style={{ color: palette.accent }}>Today</ThemedText>
            </Pressable>
          ) : null}
          <View style={styles.badgeSpacer} />
          <View style={[styles.badge, { backgroundColor: classColor }]}>
            <ThemedText style={styles.badgeText}>{tideClass.label}</ThemedText>
          </View>
          <ThemedText type="caption" style={{ color: palette.muted }}>
            {range.toFixed(1)} m range
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <TideCurve
            series={series}
            events={events}
            now={isToday ? now : undefined}
            height={220}
            scrubbable
          />
          <ThemedText type="caption" style={{ color: palette.muted }}>
            Tap the chart to read the level at any time.
          </ThemedText>
          <TideTable events={events} />
        </View>

        <ThresholdTool station={station} dayStart={dayStart} />

        <SunMoonCard date={dayStart} lat={station.lat} lon={station.lon} />

        <WeekOverview station={station} fromYmd={ymd} selectedYmd={ymd} onSelectDay={setYmd} />

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
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badgeSpacer: { flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  todayLink: { paddingVertical: 4, paddingHorizontal: 4 },
  info: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 6 },
});
