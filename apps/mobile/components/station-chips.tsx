// Horizontal station switcher: a scrollable row of chips (favourites first,
// starred). Shared by the Tides and Plan tabs so switching station feels the
// same on both.

import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';
import { useSelectedStation } from '@/lib/selected-station';
import { STATIONS } from '@/lib/stations';

export function StationChips({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const palette = usePalette();
  const { isFavourite } = useSelectedStation();

  const chipStations = useMemo(
    () => [...STATIONS].sort((a, b) => Number(isFavourite(b.id)) - Number(isFavourite(a.id))),
    [isFavourite],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
    >
      {chipStations.map((s) => {
        const active = s.id === activeId;
        const favd = isFavourite(s.id);
        return (
          <Pressable
            key={s.id}
            onPress={() => onSelect(s.id)}
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
  );
}

const styles = StyleSheet.create({
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
});
