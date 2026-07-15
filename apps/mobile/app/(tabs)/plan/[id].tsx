import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { StationChips } from '@/components/station-chips';
import { ThemedText } from '@/components/themed-text';
import { TripPlanner } from '@/components/trip-planner';
import { usePalette } from '@/hooks/use-theme-color';
import { useSelectedStation } from '@/lib/selected-station';
import { STATIONS, stationById } from '@/lib/stations';

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return STATIONS.map((s) => ({ id: s.id }));
}

// The month / year planner for the selected station. Mirrors the Tides tab's
// /station/[id] route (same chip switcher, same station in the URL) so the two
// tabs stay in step; tapping a day here jumps back to /station/[id].
export default function PlanScreen() {
  const palette = usePalette();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const station = stationById(id) ?? STATIONS[0];
  const { stationId, setStationId } = useSelectedStation();

  useEffect(() => {
    if (station.id !== stationId) {
      setStationId(station.id);
    }
  }, [station.id, stationId, setStationId]);

  const switchStation = (sid: string) => {
    setStationId(sid);
    router.replace({ pathname: '/plan/[id]', params: { id: sid } });
  };

  return (
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
  );
}

const styles = StyleSheet.create({
  header: { gap: 12 },
});
