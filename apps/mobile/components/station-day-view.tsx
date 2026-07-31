// The full per-station "date view": now/next (today only), day navigation,
// spring/neap + coefficient badge, scrubbable curve (with daylight shading),
// HW/LW table, sun & moon, and the 7-day overview. Shared by the default tab
// and the /station/[id] deep-link route so both show the complete picture.

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { Card } from '@/components/card';
import { DayNav } from '@/components/day-nav';
import { Note } from '@/components/note';
import { SunMoonCard } from '@/components/sun-moon-card';
import { ThemedText } from '@/components/themed-text';
import { TideCurve } from '@/components/tide-curve';
import { TideTable } from '@/components/tide-table';
import { WeekOverview } from '@/components/week-overview';
import { useDayNav } from '@/hooks/use-day-nav';
import { usePalette } from '@/hooks/use-theme-color';
import { sunTimes } from '@/lib/astronomy';
import { ymdAddDays } from '@/lib/datetime';
import type { Station } from '@/lib/stations';
import { classifyTide, dayEvents, dayHeightSeries, dayRange, tidalStats } from '@/lib/tide-day';

export function StationDayView({
  station,
  initialYmd,
  syncUrl = false,
  header,
}: {
  station: Station;
  /** Optional starting day from a shareable ?d=YYYY-MM-DD link. */
  initialYmd?: string;
  /** Keep ?d= in the URL in sync (only meaningful on the /station/[id] route). */
  syncUrl?: boolean;
  /** Screen-specific identity header rendered above the day view. */
  header?: ReactNode;
}) {
  const palette = usePalette();

  // On web the chart hint is revealed on hover to keep the chart clean; on
  // native (no hover) it stays visible so tap-to-read is still discoverable.
  const [chartHovered, setChartHovered] = useState(false);

  // Keep "now" live so the current-time marker/readout stays current.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const nav = useDayNav({ initialYmd, syncUrl });
  const { ymd, dayStart, isToday } = nav;

  // Swipe left → next day, swipe right → previous day. gesture-handler rather
  // than PanResponder, whose panHandlers spread onStartShouldSetResponder and
  // friends onto the View — RN-Web 0.21 passes those to the DOM node and React
  // logs "Unknown event handler property" for each. activeOffsetX/failOffsetY
  // state the old "clearly-horizontal drags only" rule declaratively, so the
  // chart keeps its own scrub and vertical scrolling still reaches the
  // ScrollView. Latest ymd/handler come from a ref so the gesture — built once
  // — never acts on a stale day.
  const swipeRef = useRef({ ymd, go: nav.setDay });
  swipeRef.current = { ymd, go: nav.setDay };
  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-24, 24])
        .failOffsetY([-24, 24])
        .onEnd((e) => {
          const { ymd: cur, go } = swipeRef.current;
          if (e.translationX <= -40) {
            go(ymdAddDays(cur, 1));
          } else if (e.translationX >= 40) {
            go(ymdAddDays(cur, -1));
          }
        }),
    [],
  );

  const events = useMemo(() => dayEvents(station, dayStart), [station, dayStart]);
  const series = useMemo(() => dayHeightSeries(station, dayStart), [station, dayStart]);
  // Evaluate at midday so the returned sunrise/sunset land on this civil day
  // (UK midnight is the previous UTC day in summer) — matches SunMoonCard.
  const sun = useMemo(
    () => sunTimes(new Date(dayStart.getTime() + 12 * 3600_000), station.lat, station.lon),
    [dayStart, station.lat, station.lon],
  );

  const stats = useMemo(() => tidalStats(station), [station]);
  const range = useMemo(() => dayRange(events), [events]);
  const tideClass = useMemo(() => classifyTide(range, stats), [range, stats]);
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
      <GestureDetector gesture={swipe}>
        <View style={styles.inner}>
          {header}

          <DayNav nav={nav}>
            <View style={[styles.badge, { backgroundColor: classColor }]}>
              <ThemedText style={styles.badgeText}>
                {tideClass.label} · {tideClass.coefficient}
              </ThemedText>
            </View>
            <ThemedText type="caption" style={{ color: palette.muted }}>
              {range.toFixed(1)} m range
            </ThemedText>
          </DayNav>

          <Card
            onPointerEnter={() => setChartHovered(true)}
            onPointerLeave={() => setChartHovered(false)}
          >
            <TideCurve
              series={series}
              events={events}
              now={isToday ? now : undefined}
              height={220}
              scrubbable
              sun={sun}
            />
            <ThemedText
              type="caption"
              style={[
                { color: palette.muted },
                Platform.OS === 'web' && !chartHovered && styles.hintHidden,
              ]}
            >
              Tap the chart to read the level at any time. Gold band = daylight.
            </ThemedText>
            <TideTable events={events} now={isToday ? now : undefined} />
          </Card>

          <SunMoonCard date={dayStart} lat={station.lat} lon={station.lon} />

          <WeekOverview
            station={station}
            fromYmd={ymd}
            selectedYmd={ymd}
            onSelectDay={nav.setDay}
          />

          <Note>
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
              Astronomical only (no surge). Water levels, not streams — never plan a race transit
              from these tables.
            </ThemedText>
          </Note>
        </View>
      </GestureDetector>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  inner: { gap: 16 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  hintHidden: { opacity: 0 },
});
