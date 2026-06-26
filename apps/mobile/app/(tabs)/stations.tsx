import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ScotlandMap } from '@/components/scotland-map';
import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';
import { useSelectedStation } from '@/lib/selected-station';
import { REGION_ORDER, STATIONS } from '@/lib/stations';

export default function StationsScreen() {
  const palette = usePalette();
  const router = useRouter();
  const { stationId, setStationId } = useSelectedStation();

  const open = (id: string) => {
    setStationId(id);
    router.push({ pathname: '/station/[id]', params: { id } });
  };

  const byRegion = REGION_ORDER.map((region) => ({
    region,
    items: STATIONS.filter((s) => s.region === region),
  })).filter((g) => g.items.length > 0);

  return (
    <ScrollView contentContainerStyle={styles.content} style={{ backgroundColor: palette.background }}>
      <ScotlandMap stations={STATIONS} selectedId={stationId} onSelect={open} />

      {byRegion.map(({ region, items }) => (
        <View key={region} style={styles.group}>
          <ThemedText type="caption" style={[styles.groupTitle, { color: palette.muted }]}>
            {region.toUpperCase()}
          </ThemedText>
          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            {items.map((s, i) => (
              <Pressable
                key={s.id}
                onPress={() => open(s.id)}
                style={[
                  styles.row,
                  i < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">{s.name}</ThemedText>
                  {s.subtitle ? (
                    <ThemedText type="caption" style={{ color: palette.muted }}>
                      {s.subtitle}
                    </ThemedText>
                  ) : null}
                </View>
                {!s.standardPort ? (
                  <View style={[styles.badge, { borderColor: palette.border }]}>
                    <ThemedText type="caption" style={{ color: palette.muted }}>
                      secondary
                    </ThemedText>
                  </View>
                ) : null}
                <ThemedText style={{ color: palette.muted }}>›</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <ThemedText type="caption" style={[styles.footer, { color: palette.muted }]}>
        More ports as the data is fitted. Each station is a small set of harmonic constituents
        bundled in the app — predictions run entirely offline.
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  group: { gap: 8 },
  groupTitle: { letterSpacing: 0.6 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  badge: { borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 6, paddingVertical: 2 },
  footer: { lineHeight: 18 },
});
