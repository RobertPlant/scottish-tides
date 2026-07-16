// The trip planner: a whole-year heatmap for one station. Every day is painted
// on the neap↔spring ramp so you can scan for the tides you want — bigger
// springs (stronger streams, wider range) or gentler neaps — with weekends
// outlined so a weekend trip is easy to spot. Tap any day to open it on the
// Tides tab. Purely a visual overview: it makes no judgement about which tides
// are "good" (that depends on your trip); see the note at the foot.

import { useRouter } from 'expo-router';
import { type ReactNode, useMemo, useState } from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Note } from '@/components/note';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/hooks/use-theme-color';
import { ymdInUk } from '@/lib/datetime';
import { coeffFill, type DayCell, type Scheme, yearMonths } from '@/lib/planner';
import type { Station } from '@/lib/stations';
import { tidalStats } from '@/lib/tide-day';

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
const COLS = 31; // widest month; short months trail blank so rows stay aligned
const YEAR_SPAN = 5; // how far the ‹ › buttons roam from the current year

export function TripPlanner({ station, header }: { station: Station; header?: ReactNode }) {
  const palette = usePalette();
  const scheme: Scheme = useColorScheme() ?? 'light';
  const router = useRouter();

  const todayYmd = useMemo(() => ymdInUk(new Date()), []);
  const nowY = Number(todayYmd.slice(0, 4));

  const [year, setYear] = useState(nowY);
  const stats = useMemo(() => tidalStats(station), [station]);
  const months = useMemo(() => yearMonths(station, year, stats), [station, year, stats]);

  const minYear = nowY - YEAR_SPAN;
  const maxYear = nowY + YEAR_SPAN;
  const canPrev = year > minYear;
  const canNext = year < maxYear;

  // Measure the day-cell strip once and give every cell the same integer width,
  // so flexbox subpixel rounding can't leave the grid looking ragged.
  const [cellW, setCellW] = useState<number | null>(null);
  const onCellsLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width / COLS);
    if (w > 0 && w !== cellW) {
      setCellW(w);
    }
  };

  const openDay = (ymd: string) => {
    router.push({ pathname: '/station/[id]', params: { id: station.id, d: ymd } });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={{ backgroundColor: palette.background }}
    >
      <View style={styles.inner}>
        {header}

        <View style={styles.navRow}>
          <Pressable
            onPress={() => setYear((y) => y - 1)}
            disabled={!canPrev}
            accessibilityRole="button"
            accessibilityLabel="Previous year"
            style={[styles.navBtn, { borderColor: palette.border, opacity: canPrev ? 1 : 0.35 }]}
          >
            <ThemedText style={{ color: palette.accent }}>‹</ThemedText>
          </Pressable>
          <ThemedText type="defaultSemiBold" style={styles.navLabel}>
            {year}
          </ThemedText>
          <Pressable
            onPress={() => setYear((y) => y + 1)}
            disabled={!canNext}
            accessibilityRole="button"
            accessibilityLabel="Next year"
            style={[styles.navBtn, { borderColor: palette.border, opacity: canNext ? 1 : 0.35 }]}
          >
            <ThemedText style={{ color: palette.accent }}>›</ThemedText>
          </Pressable>
        </View>
        {year !== nowY ? (
          <Pressable onPress={() => setYear(nowY)} accessibilityRole="button" style={styles.todayLink}>
            <ThemedText style={{ color: palette.accent }}>This year</ThemedText>
          </Pressable>
        ) : null}

        <Card gap={3}>
          {months.map(({ month, days }) => {
            const slots: (DayCell | null)[] = [...days];
            while (slots.length < COLS) {
              slots.push(null);
            }
            const cellStyle = cellW != null ? { width: cellW } : { flex: 1 };
            return (
              <View key={month} style={styles.yearRow}>
                <ThemedText type="caption" style={[styles.yearLabel, { color: palette.muted }]}>
                  {MONTHS_SHORT[month - 1]}
                </ThemedText>
                <View
                  style={styles.yearCells}
                  onLayout={month === 1 ? onCellsLayout : undefined}
                >
                  {slots.map((d, i) =>
                    d ? (
                      <DayBlock
                        key={d.ymd}
                        cell={d}
                        scheme={scheme}
                        isToday={d.ymd === todayYmd}
                        weekendRing={palette.low}
                        todayRing={palette.text}
                        gridLine={palette.surface}
                        sizeStyle={cellStyle}
                        onPick={openDay}
                      />
                    ) : (
                      <View key={`pad-${i}`} style={[styles.dayBlock, cellStyle]} />
                    ),
                  )}
                </View>
              </View>
            );
          })}
        </Card>

        <Legend scheme={scheme} palette={palette} />

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

function DayBlock({
  cell,
  scheme,
  isToday,
  weekendRing,
  todayRing,
  gridLine,
  sizeStyle,
  onPick,
}: {
  cell: DayCell;
  scheme: Scheme;
  isToday: boolean;
  weekendRing: string;
  todayRing: string;
  gridLine: string;
  sizeStyle: { width: number } | { flex: number };
  onPick: (ymd: string) => void;
}) {
  const { bg } = coeffFill(cell.cls.fraction, scheme);
  // Cells sit flush (no gaps → no dead zones between tap targets); a
  // surface-coloured hairline separates neighbours, recoloured for weekends/today.
  const border = isToday ? todayRing : cell.isWeekend ? weekendRing : gridLine;
  return (
    <Pressable
      onPress={() => onPick(cell.ymd)}
      accessibilityRole="button"
      accessibilityLabel={`${cell.ymd}: ${cell.cls.label}, ${cell.range.toFixed(1)} metres range`}
      style={[
        styles.dayBlock,
        sizeStyle,
        { backgroundColor: bg, borderColor: border, borderWidth: isToday ? 1.5 : 1 },
      ]}
    />
  );
}

function Legend({
  scheme,
  palette,
}: {
  scheme: Scheme;
  palette: ReturnType<typeof usePalette>;
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
      <View style={styles.legendRow}>
        <View style={[styles.legendSwatch, { borderColor: palette.low }]} />
        <ThemedText type="caption" style={{ color: palette.muted }}>
          Weekends are outlined. Today has a bold outline.
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  inner: { gap: 16 },

  navRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  navLabel: { flex: 1, textAlign: 'center', fontSize: 16 },
  todayLink: { alignSelf: 'center', paddingVertical: 2, paddingHorizontal: 8, marginTop: -8 },

  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  yearLabel: { width: 28, fontSize: 11 },
  // Cells are flush (no gap) so there are no dead zones between tap targets.
  yearCells: { flex: 1, flexDirection: 'row' },
  dayBlock: { height: 18, borderRadius: 2 },

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
