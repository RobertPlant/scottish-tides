import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { StationDayView } from '@/components/station-day-view';
import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';
import { useSelectedStation } from '@/lib/selected-station';
import { STATIONS, stationById } from '@/lib/stations';

export default function HomeScreen() {
  const palette = usePalette();
  const { stationId, setStationId, isFavourite } = useSelectedStation();
  const station = stationById(stationId) ?? STATIONS[0];

  // Favourite stations first in the chip row.
  const chipStations = useMemo(
    () => [...STATIONS].sort((a, b) => Number(isFavourite(b.id)) - Number(isFavourite(a.id))),
    [isFavourite],
  );

  return (
    <StationDayView
      station={station}
      header={
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {chipStations.map((s) => {
            const active = s.id === station.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setStationId(s.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? palette.tint : palette.surface,
                    borderColor: active ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={{ color: active ? palette.background : palette.text, fontWeight: '600' }}
                >
                  {s.name}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      }
    />
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingVertical: 2 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
});
