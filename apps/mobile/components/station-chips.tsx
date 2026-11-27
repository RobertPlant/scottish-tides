// Station switcher: a search box over a scrollable row of chips (favourites first,
// starred). Shared by the Tides and Plan tabs so switching station feels the
// same on both.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';
import { useSelectedStation } from '@/lib/selected-station';
import { listMatchingStations, STATIONS, type Station } from '@/lib/stations';

type ChipProps = { station: Station; isActive: boolean; isFavourite: boolean; onPress: () => void };

export const StationChips = ({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }) => {
  const palette = usePalette();
  const { isFavourite } = useSelectedStation();
  const [query, setQuery] = useState('');

  // sort, not toSorted - Hermes doesn't have it
  const chipStations = listMatchingStations(STATIONS, query).sort(
    (a, b) => Number(isFavourite(b.id)) - Number(isFavourite(a.id)),
  );
  const select = (id: string) => {
    setQuery('');
    onSelect(id);
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Find a port"
        placeholderTextColor={palette.muted}
        accessibilityLabel="Find a port"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="while-editing"
        inputMode="search"
        style={[styles.search, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border }]}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {chipStations.length === 0 ? (
          <ThemedText type="caption" style={[styles.empty, { color: palette.muted }]}>
            No ports match
          </ThemedText>
        ) : null}
        {chipStations.map(station => (
          <StationChip
            key={station.id}
            station={station}
            isActive={station.id === activeId}
            isFavourite={isFavourite(station.id)}
            onPress={() => select(station.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const StationChip = ({ station, isActive, isFavourite, onPress }: ChipProps) => {
  const palette = usePalette();
  const textColor = isActive ? palette.background : palette.text;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={isFavourite ? `${station.name} (favourite)` : station.name}
      style={[
        styles.chip,
        {
          backgroundColor: isActive ? palette.tint : palette.surface,
          borderColor: isActive ? palette.tint : palette.border,
        },
      ]}
    >
      {isFavourite ? (
        <ThemedText
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{ color: isActive ? palette.background : palette.accent }}
        >
          ★
        </ThemedText>
      ) : null}
      <ThemedText style={{ color: textColor, fontWeight: '600' }}>{station.name}</ThemedText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  search: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  chips: { gap: 8, paddingVertical: 2 },
  empty: { paddingVertical: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
