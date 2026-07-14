// Shared surface card: rounded, hairline-bordered panel on the theme surface
// colour. Used for every boxed section so the look stays consistent. Forwards
// View props (e.g. onPointerEnter for the chart card's hover behaviour).

import { StyleSheet, View, type ViewProps } from 'react-native';

import { usePalette } from '@/hooks/use-theme-color';

export function Card({ children, gap = 12, style, ...rest }: ViewProps & { gap?: number }) {
  const palette = usePalette();
  return (
    <View
      {...rest}
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border, gap },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
});
