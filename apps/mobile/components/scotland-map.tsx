// A lightweight, fully-offline locator map. There are no map tiles: station
// pins are projected from lat/lon onto an SVG, over a deliberately coarse
// (approximate) coastline drawn in the same projection. Good enough to convey
// "which bit of the coast", not for navigation.

import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

import { usePalette } from '@/hooks/use-theme-color';
import type { Station } from '@/lib/stations';

// Bounding box (lon/lat) for mainland Scotland.
const LON0 = -8.2;
const LON1 = -0.5;
const LAT0 = 54.4;
const LAT1 = 61.0;
const ASPECT = 1.45; // height / width, roughly true for these latitudes

// Coarse mainland outline (lon, lat), traced clockwise. Decorative only.
const COAST: [number, number][] = [
  [-5.0, 54.65], [-5.0, 55.05], [-5.9, 55.3], [-5.6, 55.9], [-5.35, 56.0],
  [-5.75, 56.5], [-5.95, 56.85], [-5.6, 57.2], [-5.85, 57.5], [-5.4, 57.9],
  [-5.0, 58.3], [-4.5, 58.55], [-3.5, 58.6], [-3.0, 58.65], [-3.1, 58.35],
  [-2.85, 57.7], [-2.1, 57.7], [-1.78, 57.5], [-2.1, 57.1], [-2.05, 56.8],
  [-2.5, 56.5], [-2.8, 56.42], [-2.6, 56.05], [-3.2, 56.02], [-2.9, 55.92],
  [-2.0, 55.8], [-3.0, 55.0], [-3.6, 54.9], [-5.0, 54.65],
];

export function ScotlandMap({
  stations,
  selectedId,
  onSelect,
}: {
  stations: Station[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const palette = usePalette();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const height = width * ASPECT;
  const px = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * width;
  const py = (lat: number) => (1 - (lat - LAT0) / (LAT1 - LAT0)) * height;

  const land = `${COAST.map(
    ([lon, lat], i) => `${i === 0 ? 'M' : 'L'} ${px(lon).toFixed(1)} ${py(lat).toFixed(1)}`,
  ).join(' ')} Z`;

  return (
    <View
      style={[styles.frame, { borderColor: palette.border, backgroundColor: palette.surface }]}
      onLayout={onLayout}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          <Path
            d={land}
            fill={palette.tabIconDefault}
            opacity={0.18}
            stroke={palette.muted}
            strokeWidth={1}
          />
          {stations.map((s) => {
            const selected = s.id === selectedId;
            return (
              <Circle
                key={s.id}
                cx={px(s.lon)}
                cy={py(s.lat)}
                r={selected ? 9 : 6}
                fill={selected ? palette.accent : palette.tint}
                stroke={palette.surface}
                strokeWidth={2}
                onPress={() => onSelect(s.id)}
              />
            );
          })}
          {stations.map((s) => (
            <SvgText
              key={`${s.id}-label`}
              x={px(s.lon) + 10}
              y={py(s.lat) + 4}
              fill={palette.text}
              fontSize={11}
              fontWeight={s.id === selectedId ? '700' : '400'}
            >
              {s.name}
            </SvgText>
          ))}
        </Svg>
      )}
      <Text style={[styles.noteText, { color: palette.muted }]} pointerEvents="none">
        Schematic — not for navigation
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: 8,
  },
  noteText: { position: 'absolute', right: 10, bottom: 8, fontSize: 10 },
});
