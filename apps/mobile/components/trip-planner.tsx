// The month / year trip planner. A calendar (or a compact 12-row year heatmap)
// for one station, every day painted on the neap↔spring ramp so you can scan for
// the tides you want — bigger springs (stronger streams, wider range) or gentler
// neaps — and spot the weekends at a glance. Tap any day to open it on the Tides
// tab. Purely a visual overview: it makes no judgement about which tides are
// "good" (that depends on your trip); see the note at the foot.

import { useRouter } from 'expo-router';
import { type ReactNode, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Note } from '@/components/note';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/hooks/use-theme-color';
import { UK_TZ, ymdInUk } from '@/lib/datetime';
import {
  coeffFill,
  type DayCell,
  monthDays,
  monthMatrix,
  type Scheme,
  yearMonths,
} from '@/lib/planner';
import type { Station } from '@/lib/stations';
import { tidalStats } from '@/lib/tide-day';

type Mode = 'month' | 'year';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const YEAR_SPAN = 5; // how far the ‹ › buttons roam from the current year

function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function TripPlanner({ station, header }: { station: Station; header?: ReactNode }) {
  const palette = usePalette();
  const scheme: Scheme = useColorScheme() ?? 'light';
  const router = useRouter();

  const todayYmd = useMemo(() => ymdInUk(new Date()), []);
  const [nowY, nowM] = todayYmd.split('-').map(Number);

  const [mode, setMode] = useState<Mode>('month');
  const [year, setYear] = useState(nowY);
  const [month, setMonth] = useState(nowM);

  const stats = useMemo(() => tidalStats(station), [station]);

  const weeks = useMemo(
    () => (mode === 'month' ? monthMatrix(monthDays(station, year, month, stats)) : null),
    [mode, station, year, month, stats],
  );
  const yearData = useMemo(
    () => (mode === 'year' ? yearMonths(station, year, stats) : null),
    [mode, station, year, stats],
  );

  const minYear = nowY - YEAR_SPAN;
  const maxYear = nowY + YEAR_SPAN;
  const isThisPeriod = mode === 'month' ? year === nowY && month === nowM : year === nowY;

  const step = (dir: 1 | -1) => {
    if (mode === 'year') {
      setYear((y) => Math.min(Math.max(y + dir, minYear), maxYear));
      return;
    }
    let m = month + dir;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    if (y < minYear || y > maxYear) {
      return;
    }
    setYear(y);
    setMonth(m);
  };

  const resetToNow = () => {
    setYear(nowY);
    setMonth(nowM);
  };

  const openDay = (ymd: string) => {
    router.push({ pathname: '/station/[id]', params: { id: station.id, d: ymd } });
  };

  const canPrev = mode === 'year' ? year > minYear : year > minYear || month > 1;
  const canNext = mode === 'year' ? year < maxYear : year < maxYear || month < 12;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={{ backgroundColor: palette.background }}
    >
      <View style={styles.inner}>
        {header}

        {/* Month / Year toggle */}
        <View style={[styles.segment, { borderColor: palette.border }]}>
          {(['month', 'year'] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.segmentBtn, active && { backgroundColor: palette.tint }]}
              >
                <ThemedText
                  style={{
                    color: active ? palette.background : palette.text,
                    fontWeight: '600',
                    textTransform: 'capitalize',
                  }}
                >
                  {m}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Period nav */}
        <View style={styles.navRow}>
          <Pressable
            onPress={() => step(-1)}
            disabled={!canPrev}
            accessibilityRole="button"
            accessibilityLabel="Previous"
            style={[styles.navBtn, { borderColor: palette.border, opacity: canPrev ? 1 : 0.35 }]}
          >
            <ThemedText style={{ color: palette.accent }}>‹</ThemedText>
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.navLabel}>
            {mode === 'month' ? monthLabel(year, month) : String(year)}
          </ThemedText>
          <Pressable
            onPress={() => step(1)}
            disabled={!canNext}
            accessibilityRole="button"
            accessibilityLabel="Next"
            style={[styles.navBtn, { borderColor: palette.border, opacity: canNext ? 1 : 0.35 }]}
          >
            <ThemedText style={{ color: palette.accent }}>›</ThemedText>
          </Pressable>
        </View>
        {!isThisPeriod ? (
          <Pressable onPress={resetToNow} accessibilityRole="button" style={styles.todayLink}>
            <ThemedText style={{ color: palette.accent }}>
              {mode === 'month' ? 'This month' : 'This year'}
            </ThemedText>
          </Pressable>
        ) : null}

        {mode === 'month' && weeks ? (
          <MonthGrid
            weeks={weeks}
            scheme={scheme}
            todayYmd={todayYmd}
            weekendRing={palette.low}
            todayRing={palette.text}
            onPick={openDay}
          />
        ) : null}

        {mode === 'year' && yearData ? (
          <YearGrid
            months={yearData}
            scheme={scheme}
            todayYmd={todayYmd}
            mutedInk={palette.muted}
            todayRing={palette.text}
            onPick={openDay}
          />
        ) : null}

        <Legend scheme={scheme} palette={palette} showWeekend={mode === 'month'} />

        <Note>
          <ThemedText type="caption" style={{ color: palette.muted }}>
            Each day is shaded by its tidal range on this station's neap→spring scale. Springs mean
            a wider range and stronger tidal streams; neaps are gentler. Which is "favourable"
            depends on your trip — this is an overview, not advice.
          </ThemedText>
          <ThemedText type="caption" style={{ color: palette.muted }}>
            Astronomical only (no weather/surge). Tap a day to open its curve, HW/LW times, and sun
            & moon on the Tides tab.
          </ThemedText>
        </Note>
      </View>
    </ScrollView>
  );
}

// ── Month calendar ──────────────────────────────────────────────────────────

function MonthGrid({
  weeks,
  scheme,
  todayYmd,
  weekendRing,
  todayRing,
  onPick,
}: {
  weeks: (DayCell | null)[][];
  scheme: Scheme;
  todayYmd: string;
  weekendRing: string;
  todayRing: string;
  onPick: (ymd: string) => void;
}) {
  const palette = usePalette();
  return (
    <Card gap={6}>
      <View style={styles.weekHead}>
        {WEEKDAYS.map((w, i) => (
          <ThemedText
            key={w}
            type="caption"
            style={[styles.weekHeadCell, { color: i >= 5 ? weekendRing : palette.muted }]}
          >
            {w}
          </ThemedText>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((cell, di) =>
            cell ? (
              <MonthCell
                key={cell.ymd}
                cell={cell}
                scheme={scheme}
                isToday={cell.ymd === todayYmd}
                weekendRing={weekendRing}
                todayRing={todayRing}
                onPick={onPick}
              />
            ) : (
              <View key={di} style={styles.dayCell} />
            ),
          )}
        </View>
      ))}
    </Card>
  );
}

function MonthCell({
  cell,
  scheme,
  isToday,
  weekendRing,
  todayRing,
  onPick,
}: {
  cell: DayCell;
  scheme: Scheme;
  isToday: boolean;
  weekendRing: string;
  todayRing: string;
  onPick: (ymd: string) => void;
}) {
  const { bg, ink } = coeffFill(cell.cls.fraction, scheme);
  const ringColor = isToday ? todayRing : cell.isWeekend ? weekendRing : 'transparent';
  return (
    <Pressable
      onPress={() => onPick(cell.ymd)}
      accessibilityRole="button"
      accessibilityLabel={`${cell.ymd}: ${cell.cls.label}, ${cell.range.toFixed(1)} metres range`}
      style={[
        styles.dayCell,
        styles.dayFill,
        { backgroundColor: bg, borderColor: ringColor, borderWidth: isToday ? 2 : 1.5 },
      ]}
    >
      <ThemedText style={[styles.dayNum, { color: ink, fontWeight: isToday ? '800' : '600' }]}>
        {cell.day}
      </ThemedText>
      <ThemedText style={[styles.dayRange, { color: ink }]}>{cell.range.toFixed(1)}</ThemedText>
    </Pressable>
  );
}

// ── Year heatmap ────────────────────────────────────────────────────────────

function YearGrid({
  months,
  scheme,
  todayYmd,
  mutedInk,
  todayRing,
  onPick,
}: {
  months: { month: number; days: DayCell[] }[];
  scheme: Scheme;
  todayYmd: string;
  mutedInk: string;
  todayRing: string;
  onPick: (ymd: string) => void;
}) {
  return (
    <Card gap={4}>
      {months.map(({ month, days }) => (
        <View key={month} style={styles.yearRow}>
          <ThemedText type="caption" style={[styles.yearLabel, { color: mutedInk }]}>
            {MONTHS_SHORT[month - 1]}
          </ThemedText>
          <View style={styles.yearCells}>
            {days.map((d) => {
              const { bg } = coeffFill(d.cls.fraction, scheme);
              const isToday = d.ymd === todayYmd;
              return (
                <Pressable
                  key={d.ymd}
                  onPress={() => onPick(d.ymd)}
                  hitSlop={3}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.ymd}: ${d.cls.label}`}
                  style={[
                    styles.yearCell,
                    { backgroundColor: bg },
                    isToday && { borderColor: todayRing, borderWidth: 1.5 },
                  ]}
                />
              );
            })}
          </View>
        </View>
      ))}
    </Card>
  );
}

// ── Legend ──────────────────────────────────────────────────────────────────

function Legend({
  scheme,
  palette,
  showWeekend,
}: {
  scheme: Scheme;
  palette: ReturnType<typeof usePalette>;
  showWeekend: boolean;
}) {
  const stops = Array.from({ length: 24 }, (_, i) => i / 23);
  return (
    <Card gap={8}>
      <View style={styles.legendRow}>
        <ThemedText type="caption" style={{ color: palette.muted }}>
          Neaps
        </ThemedText>
        <View style={styles.legendBar}>
          {stops.map((t) => (
            <View
              key={t}
              style={{ flex: 1, backgroundColor: coeffFill(t, scheme).bg, height: '100%' }}
            />
          ))}
        </View>
        <ThemedText type="caption" style={{ color: palette.muted }}>
          Springs
        </ThemedText>
      </View>
      {showWeekend ? (
        <View style={styles.legendRow}>
          <View style={[styles.legendSwatch, { borderColor: palette.low }]} />
          <ThemedText type="caption" style={{ color: palette.muted }}>
            Weekends are outlined. Today has a bold outline.
          </ThemedText>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  inner: { gap: 16 },

  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 8 },

  navRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  navLabel: { flex: 1, textAlign: 'center', fontSize: 16 },
  todayLink: { alignSelf: 'center', paddingVertical: 2, paddingHorizontal: 8, marginTop: -8 },

  weekHead: { flexDirection: 'row', gap: 4 },
  weekHeadCell: { flex: 1, textAlign: 'center', fontWeight: '600' },
  weekRow: { flexDirection: 'row', gap: 4 },
  dayCell: { flex: 1, aspectRatio: 1, borderRadius: 8 },
  dayFill: {
    padding: 4,
    justifyContent: 'space-between',
    borderStyle: 'solid',
  },
  dayNum: { fontSize: 13, lineHeight: 15 },
  dayRange: { fontSize: 9, opacity: 0.85, alignSelf: 'flex-end' },

  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  yearLabel: { width: 28, fontSize: 11 },
  yearCells: { flex: 1, flexDirection: 'row', gap: 1 },
  yearCell: { flex: 1, height: 16, borderRadius: 2 },

  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendBar: {
    flex: 1,
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  legendSwatch: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5 },
});
