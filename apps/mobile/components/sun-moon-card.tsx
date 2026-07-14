// Sun & moon summary for the selected day: daylight window and moon phase.

import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';
import { moonInfo, sunTimes } from '@/lib/astronomy';
import { formatTime } from '@/lib/datetime';

function hm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

export function SunMoonCard({ date, lat, lon }: { date: Date; lat: number; lon: number }) {
  const palette = usePalette();
  // Use mid-day of the civil date for a stable moon value.
  const noon = new Date(date.getTime() + 12 * 3600_000);
  const sun = sunTimes(noon, lat, lon);
  const moon = moonInfo(noon);

  const daylight = sun.alwaysUp
    ? 'Sun up all day'
    : sun.sunrise && sun.sunset
      ? `${formatTime(sun.sunrise)} – ${formatTime(sun.sunset)}`
      : 'No sunrise';

  return (
    <Card style={styles.card}>
      <View style={styles.col}>
        <ThemedText type="caption" style={{ color: palette.muted }}>
          ☀︎ Daylight
        </ThemedText>
        <ThemedText type="defaultSemiBold">{daylight}</ThemedText>
        {!sun.alwaysUp && sun.sunrise ? (
          <ThemedText type="caption" style={{ color: palette.muted }}>
            {hm(sun.daylightMinutes)} of light
          </ThemedText>
        ) : null}
      </View>
      <View style={[styles.divider, { backgroundColor: palette.border }]} />
      <View style={styles.col}>
        <ThemedText type="caption" style={{ color: palette.muted }}>
          Moon
        </ThemedText>
        <ThemedText type="defaultSemiBold">
          {moon.emoji} {moon.name}
        </ThemedText>
        <ThemedText type="caption" style={{ color: palette.muted }}>
          {Math.round(moon.illumination * 100)}% illuminated
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row' },
  col: { flex: 1, gap: 2 },
  divider: { width: StyleSheet.hairlineWidth },
});
