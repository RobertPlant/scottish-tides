// The full per-station "date view": now/next (today only), day navigation,
// spring/neap + coefficient badge, scrubbable curve (with daylight shading),
// HW/LW table, sun & moon, and the 7-day overview. Shared by the default tab
// and the /station/[id] deep-link route so both show the complete picture.

import { useRouter } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { NowNext } from '@/components/now-next';
import { SunMoonCard } from '@/components/sun-moon-card';
import { ThemedText } from '@/components/themed-text';
import { TideCurve } from '@/components/tide-curve';
import { TideTable } from '@/components/tide-table';
import { WeekOverview } from '@/components/week-overview';
import { usePalette } from '@/hooks/use-theme-color';
import { sunTimes } from '@/lib/astronomy';
import { formatLongDay, ukDayStartFromYmd, ymdAddDays, ymdInUk } from '@/lib/datetime';
import type { Station } from '@/lib/stations';
import {
  classifyTide,
  dayEvents,
  dayHeightSeries,
  dayRange,
  nowState,
  tidalStats,
} from '@/lib/tide-day';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function StationDayView({
  station,
  initialYmd,
  syncUrl = false,
  header,
  showStationName = true,
}: {
  station: Station;
  /** Optional starting day from a shareable ?d=YYYY-MM-DD link. */
  initialYmd?: string;
  /** Keep ?d= in the URL in sync (only meaningful on the /station/[id] route). */
  syncUrl?: boolean;
  /** Screen-specific identity header rendered above the day view. */
  header?: ReactNode;
  /** Show the station name inside the now/next card (off when the header already names it). */
  showStationName?: boolean;
}) {
  const palette = usePalette();
  const router = useRouter();

  // Keep "now" live so the now/next card and the current-time marker stay current.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const todayYmd = useMemo(() => ymdInUk(now), [now]);
  const [ymd, setYmd] = useState(() =>
    initialYmd && YMD_RE.test(initialYmd) ? initialYmd : ymdInUk(new Date()),
  );
  const dayStart = useMemo(() => ukDayStartFromYmd(ymd), [ymd]);

  const updateYmd = useCallback(
    (next: string) => {
      setYmd(next);
      if (syncUrl) {
        router.setParams({ d: next });
      }
    },
    [router, syncUrl],
  );

  const minYmd = useMemo(() => ymdAddDays(todayYmd, -730), [todayYmd]);
  const maxYmd = useMemo(() => ymdAddDays(todayYmd, 730), [todayYmd]);

  const events = useMemo(() => dayEvents(station, dayStart), [station, dayStart]);
  const series = useMemo(() => dayHeightSeries(station, dayStart), [station, dayStart]);
  // Evaluate at midday so the returned sunrise/sunset land on this civil day
  // (UK midnight is the previous UTC day in summer) — matches SunMoonCard.
  const sun = useMemo(
    () => sunTimes(new Date(dayStart.getTime() + 12 * 3600_000), station.lat, station.lon),
    [dayStart, station.lat, station.lon],
  );
  const isToday = ymd === todayYmd;
  const state = useMemo(() => nowState(station, now), [station, now]);

  const tideClass = useMemo(
    () => classifyTide(dayRange(events), tidalStats(station)),
    [station, events],
  );
  const range = dayRange(events);
  const classColor =
    tideClass.label === 'Springs'
      ? palette.accent
      : tideClass.label === 'Neaps'
        ? palette.muted
        : palette.tint;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={{ backgroundColor: palette.background }}
    >
      {header}

      {isToday ? (
        <NowNext station={station} state={state} now={now} showName={showStationName} />
      ) : null}

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
        <View style={styles.badgeSpacer} />
        <View style={[styles.badge, { backgroundColor: classColor }]}>
          <ThemedText style={styles.badgeText}>
            {tideClass.label} · {tideClass.coefficient}
          </ThemedText>
        </View>
        <ThemedText type="caption" style={{ color: palette.muted }}>
          {range.toFixed(1)} m range
        </ThemedText>
      </View>

      <View
        style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        <TideCurve
          series={series}
          events={events}
          now={isToday ? now : undefined}
          height={220}
          scrubbable
          sun={sun}
        />
        <ThemedText type="caption" style={{ color: palette.muted }}>
          Tap the chart to read the level at any time. Gold band = daylight.
        </ThemedText>
        <TideTable events={events} />
      </View>

      <SunMoonCard date={dayStart} lat={station.lat} lon={station.lon} />

      <WeekOverview station={station} fromYmd={ymd} selectedYmd={ymd} onSelectDay={updateYmd} />

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
          Astronomical only (no surge). Water levels, not streams — never plan a race transit from
          these tables.
        </ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  navButton: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  navLabel: { flex: 1, textAlign: 'center' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badgeSpacer: { flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  todayLink: { paddingVertical: 4, paddingHorizontal: 4 },
  info: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 6 },
});
