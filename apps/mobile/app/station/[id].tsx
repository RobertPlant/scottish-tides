import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { StationDayView } from '@/components/station-day-view';
import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';
import { useSelectedStation } from '@/lib/selected-station';
import { STATIONS, stationById } from '@/lib/stations';

// Pre-render one static HTML page per station so deep links like
// /station/oban survive a hard refresh on GitHub Pages.
export async function generateStaticParams(): Promise<{ id: string }[]> {
  return STATIONS.map((s) => ({ id: s.id }));
}

export default function StationDetail() {
  const palette = usePalette();
  const { id, d } = useLocalSearchParams<{ id: string; d?: string }>();
  const station = stationById(id) ?? STATIONS[0];
  const { isFavourite, toggleFavourite } = useSelectedStation();
  const fav = isFavourite(station.id);

  return (
    <>
      <Stack.Screen options={{ title: station.name }} />
      <StationDayView
        station={station}
        initialYmd={d}
        syncUrl
        header={
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <ThemedText type="title">{station.name}</ThemedText>
              {station.subtitle ? (
                <ThemedText type="caption" style={{ color: palette.muted }}>
                  {station.subtitle}
                </ThemedText>
              ) : null}
            </View>
            <Pressable
              onPress={() => toggleFavourite(station.id)}
              hitSlop={8}
              accessibilityLabel={fav ? 'Remove favourite' : 'Add favourite'}
              style={styles.star}
            >
              <ThemedText style={{ fontSize: 24, color: fav ? palette.accent : palette.muted }}>
                {fav ? '★' : '☆'}
              </ThemedText>
            </Pressable>
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  star: { paddingLeft: 8, paddingTop: 2 },
});
