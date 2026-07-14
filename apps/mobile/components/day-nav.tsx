// Day navigator UI shared by the station and stream day views: Prev / long-date
// / Next, then a date field + "Today" link and a trailing slot for view-specific
// content (the spring/neap badge, the peak-rate readout, …).

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';
import type { DayNavState } from '@/hooks/use-day-nav';
import { formatLongDay, ymdAddDays } from '@/lib/datetime';

export function DayNav({
  nav,
  children,
}: {
  nav: DayNavState;
  /** Trailing content in the picker row, pushed to the right. */
  children?: ReactNode;
}) {
  const palette = usePalette();
  const { ymd, dayStart, isToday, todayYmd, minYmd, maxYmd, setDay } = nav;

  return (
    <>
      <View style={styles.navRow}>
        <Pressable
          onPress={() => setDay(ymdAddDays(ymd, -1))}
          style={[styles.navButton, { borderColor: palette.border }]}
        >
          <ThemedText style={{ color: palette.accent }}>‹ Prev</ThemedText>
        </Pressable>
        <ThemedText type="defaultSemiBold" style={styles.navLabel}>
          {formatLongDay(dayStart)}
        </ThemedText>
        <Pressable
          onPress={() => setDay(ymdAddDays(ymd, 1))}
          style={[styles.navButton, { borderColor: palette.border }]}
        >
          <ThemedText style={{ color: palette.accent }}>Next ›</ThemedText>
        </Pressable>
      </View>

      <View style={styles.pickerRow}>
        <DateField value={ymd} onChange={setDay} min={minYmd} max={maxYmd} />
        {!isToday ? (
          <Pressable onPress={() => setDay(todayYmd)} style={styles.todayLink}>
            <ThemedText style={{ color: palette.accent }}>Today</ThemedText>
          </Pressable>
        ) : null}
        <View style={styles.spacer} />
        {children}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
  spacer: { flex: 1 },
});
