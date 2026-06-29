import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ScotlandMap } from '@/components/scotland-map';
import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';
import { RACES } from '@/lib/streams';

export default function StreamsScreen() {
  const palette = usePalette();
  const router = useRouter();
  const open = (id: string) => router.push({ pathname: '/stream/[id]', params: { id } });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={{ backgroundColor: palette.background }}
    >
      <View
        style={[styles.warn, { borderColor: palette.low, backgroundColor: `${palette.low}14` }]}
      >
        <ThemedText type="defaultSemiBold" style={{ color: palette.low }}>
          ⚠ Estimates — not a tidal stream atlas
        </ThemedText>
        <ThemedText type="caption" style={{ color: palette.muted }}>
          Slack times and rates are modelled from the tide and published peak figures. Timing and
          direction are approximate. Verify against the pilot/atlas before committing — these races
          can kill.
        </ThemedText>
      </View>

      <ScotlandMap streams={RACES} onSelectStream={open} />

      <View
        style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        {RACES.map((r, i) => (
          <Pressable
            key={r.id}
            onPress={() => open(r.id)}
            style={[
              styles.row,
              i < RACES.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderColor: palette.border,
              },
            ]}
          >
            <View style={[styles.pin, { backgroundColor: palette.low }]}>
              <ThemedText style={styles.pinText}>{i + 1}</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">{r.name}</ThemedText>
              <ThemedText type="caption" style={{ color: palette.muted }}>
                {r.area}
              </ThemedText>
            </View>
            <ThemedText style={[styles.rate, { color: palette.accent }]}>
              ~{r.springPeakKn} kn
            </ThemedText>
            <ThemedText style={{ color: palette.muted }}>›</ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedText type="caption" style={[styles.footer, { color: palette.muted }]}>
        Peak figures are spring rates (indicative, from published sources). The day's rate is scaled
        between neaps and springs by the reference port's tide.
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  warn: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 4 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  pin: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pinText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  rate: { fontWeight: '700' },
  footer: { lineHeight: 18 },
});
