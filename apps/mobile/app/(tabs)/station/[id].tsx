import { useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Pressable, StyleSheet, View } from 'react-native';

import { StationChips } from '@/components/station-chips';
import { StationDayView } from '@/components/station-day-view';
import { ThemedText } from '@/components/themed-text';
import { useRouteStation } from '@/hooks/use-route-station';
import { usePalette } from '@/hooks/use-theme-color';
import { useSelectedStation } from '@/lib/selected-station';
import { STATIONS } from '@/lib/stations';

// Pre-render one static HTML page per station so shareable links like
// /station/oban survive a hard refresh on GitHub Pages.
export async function generateStaticParams(): Promise<{ id: string }[]> {
  return STATIONS.map((s) => ({ id: s.id }));
}

// The canonical, shareable day view. It's the app's home (the first tab
// redirects here for the selected station) and the target the map opens, so the
// URL is always /station/<id> and can be shared.
export default function StationScreen() {
  const palette = usePalette();
  // Only the day param is read here; the station comes from the shared hook.
  const { d } = useLocalSearchParams<{ d?: string }>();
  const { station, switchStation } = useRouteStation('/station/[id]');
  const { isFavourite, toggleFavourite } = useSelectedStation();
  const fav = isFavourite(station.id);

  return (
    <>
      <Head>
        <title>{`${station.name} tide times · Scottish Tides`}</title>
      </Head>
      <StationDayView
        station={station}
        initialYmd={d}
        syncUrl
        header={
          <View style={styles.header}>
            <StationChips activeId={station.id} onSelect={switchStation} />

            <View style={styles.nameRow}>
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
                accessibilityRole="button"
                accessibilityLabel={fav ? 'Remove favourite' : 'Add favourite'}
                style={styles.star}
              >
                <ThemedText style={{ fontSize: 24, color: fav ? palette.accent : palette.muted }}>
                  {fav ? '★' : '☆'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: { gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start' },
  star: { paddingLeft: 8, paddingTop: 2 },
});
