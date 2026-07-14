import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { StationDayView } from '@/components/station-day-view';
import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';
import { useSelectedStation } from '@/lib/selected-station';
import { STATIONS, stationById } from '@/lib/stations';

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
  const router = useRouter();
  const { id, d } = useLocalSearchParams<{ id: string; d?: string }>();
  const station = stationById(id) ?? STATIONS[0];
  const { stationId, setStationId, isFavourite, toggleFavourite } = useSelectedStation();
  const fav = isFavourite(station.id);

  // Keep the persisted "current" station in sync with whatever we're viewing
  // (e.g. arriving via a shared link) so the Station tab points back here.
  useEffect(() => {
    if (station.id !== stationId) {
      setStationId(station.id);
    }
  }, [station.id, stationId, setStationId]);

  // Favourite stations first in the chip row.
  const chipStations = useMemo(
    () => [...STATIONS].sort((a, b) => Number(isFavourite(b.id)) - Number(isFavourite(a.id))),
    [isFavourite],
  );

  const switchStation = (sid: string) => {
    setStationId(sid);
    router.replace({ pathname: '/station/[id]', params: { id: sid } });
  };

  return (
    <StationDayView
      station={station}
      initialYmd={d}
      syncUrl
      header={
        <View style={styles.header}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {chipStations.map((s) => {
              const active = s.id === station.id;
              const favd = isFavourite(s.id);
              return (
                <Pressable
                  key={s.id}
                  onPress={() => switchStation(s.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={favd ? `${s.name} (favourite)` : s.name}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? palette.tint : palette.surface,
                      borderColor: active ? palette.tint : palette.border,
                    },
                  ]}
                >
                  {favd ? (
                    <ThemedText
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      style={{ color: active ? palette.background : palette.accent }}
                    >
                      ★
                    </ThemedText>
                  ) : null}
                  <ThemedText
                    style={{ color: active ? palette.background : palette.text, fontWeight: '600' }}
                  >
                    {s.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

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
  );
}

const styles = StyleSheet.create({
  header: { gap: 12 },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start' },
  star: { paddingLeft: 8, paddingTop: 2 },
});
