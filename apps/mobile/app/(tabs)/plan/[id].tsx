import Head from 'expo-router/head';
import { StyleSheet, View } from 'react-native';

import { StationChips } from '@/components/station-chips';
import { ThemedText } from '@/components/themed-text';
import { TripPlanner } from '@/components/trip-planner';
import { useRouteStation } from '@/hooks/use-route-station';
import { usePalette } from '@/hooks/use-theme-color';
import { STATIONS } from '@/lib/stations';

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return STATIONS.map((s) => ({ id: s.id }));
}

// The month / year planner for the selected station. Mirrors the Tides tab's
// /station/[id] route (same chip switcher, same station in the URL) so the two
// tabs stay in step; tapping a day here jumps back to /station/[id].
export default function PlanScreen() {
  const palette = usePalette();
  const { station, switchStation } = useRouteStation('/plan/[id]');

  return (
    <>
      <Head>
        <title>{`${station.name} tide planner · Scottish Tides`}</title>
      </Head>
      <TripPlanner
        station={station}
        header={
          <View style={styles.header}>
            <StationChips activeId={station.id} onSelect={switchStation} />
            <View>
              <ThemedText type="title">{station.name}</ThemedText>
              <ThemedText type="caption" style={{ color: palette.muted }}>
                Plan ahead — pick a day for the tides you want
              </ThemedText>
            </View>
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: { gap: 12 },
});
