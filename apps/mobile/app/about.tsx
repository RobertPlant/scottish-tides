// About & attributions: licence, source, and credit for the data and libraries
// the app is built on (BODC tide data, Natural Earth coastline, pytides, etc.).

import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';

const REPO = 'https://github.com/RobertPlant/scottish-tides';

interface Credit {
  what: string;
  detail: string;
  url?: string;
}

const CREDITS: Credit[] = [
  {
    what: 'Tide predictions',
    detail:
      'Harmonic constituents fitted from UK National Tide Gauge Network data — owned by the Environment Agency, provided by the British Oceanographic Data Centre (BODC).',
    url: 'https://www.bodc.ac.uk/',
  },
  {
    what: 'Tide engine',
    detail: 'A TypeScript port of pytides by Sam Cox (MIT licence).',
    url: 'https://github.com/sam-cox/pytides',
  },
  {
    what: 'Coastline map',
    detail: 'Natural Earth 1:10m data (public domain).',
    url: 'https://www.naturalearthdata.com/',
  },
  {
    what: 'Tidal streams',
    detail:
      'Slack/peak timing calibrated against published figures, including the Falls of Lora predictions at fallsoflora.info.',
    url: 'https://www.fallsoflora.info/',
  },
  {
    what: 'Built with',
    detail: 'Expo and React Native (MIT licence), react-native-svg, and gesture-handler.',
    url: 'https://expo.dev/',
  },
];

export default function About() {
  const palette = usePalette();
  const version = Constants.expoConfig?.version ?? '';

  const open = (url?: string) => {
    if (url) {
      void Linking.openURL(url);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'About' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        style={{ backgroundColor: palette.background }}
      >
        <View>
          <ThemedText type="title">Scottish Tides</ThemedText>
          {version ? (
            <ThemedText type="caption" style={{ color: palette.muted }}>
              Version {version}
            </ThemedText>
          ) : null}
          <ThemedText style={{ marginTop: 8 }}>
            Offline tide predictions and tidal-stream estimates for Scottish waters. All predictions
            run on-device — no account, no tracking, no network needed.
          </ThemedText>
        </View>

        <View
          style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <ThemedText type="defaultSemiBold">Source &amp; licence</ThemedText>
          <ThemedText type="caption" style={{ color: palette.muted }}>
            Free software under the GNU General Public License v3.0. You can use, study, share and
            improve it.
          </ThemedText>
          <Pressable onPress={() => open(REPO)} style={styles.linkRow}>
            <ThemedText type="link">View the source on GitHub →</ThemedText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText type="caption" style={[styles.sectionTitle, { color: palette.muted }]}>
            DATA &amp; CREDITS
          </ThemedText>
          <View
            style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            {CREDITS.map((c, i) => (
              <Pressable
                key={c.what}
                onPress={() => open(c.url)}
                disabled={!c.url}
                style={[
                  styles.creditRow,
                  i < CREDITS.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderColor: palette.border,
                  },
                ]}
              >
                <ThemedText type="defaultSemiBold">{c.what}</ThemedText>
                <ThemedText type="caption" style={{ color: palette.muted }}>
                  {c.detail}
                </ThemedText>
                {c.url ? (
                  <ThemedText type="caption" style={{ color: palette.accent }}>
                    {c.url.replace(/^https?:\/\//, '').replace(/\/$/, '')} →
                  </ThemedText>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>

        <View
          style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <ThemedText type="defaultSemiBold">Disclaimer</ThemedText>
          <ThemedText type="caption" style={{ color: palette.muted }}>
            Heights are astronomical predictions and exclude weather (surge). Tidal streams are
            modelled estimates, not a stream atlas. Never use this app as your sole source for
            navigation or for planning a race transit — always cross-check the official pilot, chart
            and tidal-stream atlas.
          </ThemedText>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 8 },
  linkRow: { paddingTop: 2 },
  section: { gap: 8 },
  sectionTitle: { letterSpacing: 0.6 },
  creditRow: { paddingVertical: 12, gap: 3 },
});
