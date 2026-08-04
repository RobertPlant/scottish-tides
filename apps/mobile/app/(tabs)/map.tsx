import Head from 'expo-router/head';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Note } from '@/components/note';
import { ScotlandMap } from '@/components/scotland-map';
import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';
import { nearestStation } from '@/lib/geo';
import { getCurrentCoords } from '@/lib/native-location';
import { useSelectedStation } from '@/lib/selected-station';
import { REGION_ORDER, type Station, STATIONS, stationById } from '@/lib/stations';
import { RACES } from '@/lib/streams';

export default function MapScreen() {
  const palette = usePalette();
  const router = useRouter();
  const { stationId, setStationId, favourites } = useSelectedStation();
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState<string | null>(null);

  const open = (id: string) => {
    setStationId(id);
    // Station is a tab now — switch to it rather than pushing a stacked copy.
    router.navigate({ pathname: '/station/[id]', params: { id } });
  };
  const openStream = (id: string) => router.push({ pathname: '/stream/[id]', params: { id } });

  const findNearest = async () => {
    setLocErr(null);

    // Web: use the browser geolocation API (its own permission prompt).
    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setLocErr('Location is not available in this browser.');
        return;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          const { station } = nearestStation(pos.coords.latitude, pos.coords.longitude);
          open(station.id);
        },
        () => {
          setLocating(false);
          setLocErr('Could not get your location.');
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
      );
      return;
    }

    // Native: ask for foreground location permission, then locate.
    setLocating(true);
    try {
      const coords = await getCurrentCoords();
      if (!coords) {
        setLocating(false);
        setLocErr('Location permission denied — enable it in Settings to use this.');
        return;
      }
      setLocating(false);
      const { station } = nearestStation(coords.latitude, coords.longitude);
      open(station.id);
    } catch {
      setLocating(false);
      setLocErr('Could not get your location.');
    }
  };

  const favStations = favourites
    .map((id) => stationById(id))
    .filter((s): s is Station => Boolean(s));

  const byRegion = REGION_ORDER.map((region) => ({
    region,
    items: STATIONS.filter((s) => s.region === region),
  })).filter((g) => g.items.length > 0);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={{ backgroundColor: palette.background }}
    >
      <Head>
        <title>Ports &amp; tidal streams · Scottish Tides</title>
      </Head>
      <ScotlandMap
        stations={STATIONS}
        selectedId={stationId}
        onSelect={open}
        streams={RACES}
        onSelectStream={openStream}
      />

      <Pressable
        onPress={findNearest}
        accessibilityRole="button"
        accessibilityLabel="Find tides near me"
        accessibilityState={{ busy: locating }}
        style={[styles.nearBtn, { borderColor: palette.border, backgroundColor: palette.surface }]}
      >
        <ThemedText style={{ color: palette.accent, fontWeight: '600' }}>
          {locating ? 'Locating…' : '📍 Tides near me'}
        </ThemedText>
      </Pressable>
      {locErr ? (
        <ThemedText type="caption" style={{ color: palette.muted, marginTop: -8 }}>
          {locErr}
        </ThemedText>
      ) : null}

      {favStations.length > 0 ? (
        <Group title="★ FAVOURITES" items={favStations} palette={palette} onOpen={open} />
      ) : null}

      {byRegion.map(({ region, items }) => (
        <Group
          key={region}
          title={region.toUpperCase()}
          items={items}
          palette={palette}
          onOpen={open}
        />
      ))}

      <View style={styles.group}>
        <ThemedText type="caption" style={[styles.groupTitle, { color: palette.muted }]}>
          ◆ TIDAL STREAMS
        </ThemedText>
        <Note tone="warn" gap={4}>
          <ThemedText type="defaultSemiBold" style={{ color: palette.low }}>
            ⚠ Estimates — not a tidal stream atlas
          </ThemedText>
          <ThemedText type="caption" style={{ color: palette.muted }}>
            Slack times and rates are modelled from the tide and published peak figures. Timing and
            direction are approximate. Verify against the pilot/atlas before committing — these
            races can kill.
          </ThemedText>
        </Note>
        <View
          style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          {RACES.map((r, i) => (
            <Pressable
              key={r.id}
              onPress={() => openStream(r.id)}
              accessibilityRole="button"
              accessibilityLabel={`${r.name}, ${r.area}, about ${r.springPeakKn} knots at springs`}
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
      </View>

      <ThemedText type="caption" style={[styles.footer, { color: palette.muted }]}>
        More ports as the data is fitted. Each station is a small set of harmonic constituents
        bundled in the app — predictions run entirely offline.
      </ThemedText>

      <Pressable
        onPress={() => router.push('/about')}
        accessibilityRole="link"
        accessibilityLabel="About and data sources"
        style={styles.aboutLink}
      >
        <ThemedText style={{ color: palette.accent, fontWeight: '600' }}>
          About &amp; data sources →
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

// Hoisted out of MapScreen: a component declared inside another component is a
// new type on every render, so React unmounts and remounts the whole station
// list (losing its scroll position and any pressed state) whenever the screen
// re-renders — e.g. while "Locating…".
function Row({
  s,
  last,
  palette,
  onOpen,
}: {
  s: Station;
  last: boolean;
  palette: ReturnType<typeof usePalette>;
  onOpen: (id: string) => void;
}) {
  const { isFavourite, toggleFavourite } = useSelectedStation();
  const favd = isFavourite(s.id);
  return (
    // The star sits BESIDE the row button, not inside it: nesting two
    // Pressables put a <button> inside a <button> on web, which is invalid
    // HTML and threw a hydration error.
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.border },
      ]}
    >
      <Pressable
        onPress={() => toggleFavourite(s.id)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={
          favd ? `Remove ${s.name} from favourites` : `Add ${s.name} to favourites`
        }
        style={styles.star}
      >
        <ThemedText
          importantForAccessibility="no"
          style={{ fontSize: 18, color: favd ? palette.accent : palette.tabIconDefault }}
        >
          {favd ? '★' : '☆'}
        </ThemedText>
      </Pressable>
      <Pressable
        onPress={() => onOpen(s.id)}
        accessibilityRole="button"
        accessibilityLabel={`${s.name}${s.subtitle ? `, ${s.subtitle}` : ''}${
          !s.standardPort ? ', secondary port' : ''
        }`}
        style={styles.rowMain}
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
    </View>
  );
}

function Group({
  title,
  items,
  palette,
  onOpen,
}: {
  title: string;
  items: Station[];
  palette: ReturnType<typeof usePalette>;
  onOpen: (id: string) => void;
}) {
  return (
    <View style={styles.group}>
      <ThemedText type="caption" style={[styles.groupTitle, { color: palette.muted }]}>
        {title}
      </ThemedText>
      <View
        style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        {items.map((s, i) => (
          <Row key={s.id} s={s} last={i === items.length - 1} palette={palette} onOpen={onOpen} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  nearBtn: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    alignItems: 'center',
  },
  group: { gap: 8 },
  groupTitle: { letterSpacing: 0.6 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  // Carries the row's own layout now that the star is a sibling, not a child.
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  star: { paddingRight: 2 },
  pin: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pinText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  rate: { fontWeight: '700' },
  badge: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  footer: { lineHeight: 18 },
  aboutLink: { alignItems: 'center', paddingVertical: 4 },
});
