// A lightweight, fully-offline locator map. No map tiles: a schematic coastline
// (mainland + major islands) is drawn from hand-traced lat/lon polygons, with
// station pins projected on top. An equirectangular projection with longitude
// scaled by cos(latitude) keeps Scotland from looking squashed. Decorative — not
// for navigation.

import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

import coastRings from '@/assets/data/scotland-coast.json';
import { usePalette } from '@/hooks/use-theme-color';
import type { Station } from '@/lib/stations';

// Real coastline: Natural Earth 10m (via world-atlas), GB clipped to the Scotland
// bounding box below, decimated. See tools — regenerate if the box changes.
const COAST = coastRings as [number, number][][];

const LON0 = -8.2;
const LON1 = -0.5;
const LAT0 = 54.4;
const LAT1 = 61.0;
const MID_LAT = (LAT0 + LAT1) / 2;
const LON_SCALE = Math.cos((MID_LAT * Math.PI) / 180);
// Undistorted aspect: 1° lat ≈ 111 km, 1° lon ≈ 111·cos(lat) km.
const ASPECT = (LAT1 - LAT0) / ((LON1 - LON0) * LON_SCALE);

// Vertical label nudges (px) for stations whose labels would otherwise collide.
const LABEL_DY: Record<string, number> = {
  kinlochbervie: -7, // raise (it sits just W of and level with Wick)
  wick: 9, // drop below the pin line
};

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
  const isDark = palette.background === '#06121d';
  const sea = isDark ? '#0a1c29' : '#d8e7f0';
  const land = isDark ? '#16302a' : '#cdd9cb';
  const coast = isDark ? '#2c4a44' : '#9fb09c';

  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const height = width * ASPECT;
  const px = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * width;
  const py = (lat: number) => (1 - (lat - LAT0) / (LAT1 - LAT0)) * height;
  const ringPath = (ring: [number, number][]) =>
    `${ring.map(([lon, lat], i) => `${i === 0 ? 'M' : 'L'} ${px(lon).toFixed(1)} ${py(lat).toFixed(1)}`).join(' ')} Z`;

  return (
    <View
      style={[styles.frame, { borderColor: palette.border, backgroundColor: sea }]}
      onLayout={onLayout}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          <Rect x={0} y={0} width={width} height={height} fill={sea} />
          {COAST.map((ring, i) => (
            <Path key={i} d={ringPath(ring)} fill={land} stroke={coast} strokeWidth={0.5} />
          ))}
          {stations.map((s) => {
            const selected = s.id === selectedId;
            return (
              <Circle
                key={s.id}
                cx={px(s.lon)}
                cy={py(s.lat)}
                r={selected ? 8 : 5}
                fill={selected ? palette.accent : palette.tint}
                stroke="#ffffff"
                strokeWidth={1.5}
                onPress={() => onSelect(s.id)}
              />
            );
          })}
          {stations.map((s) => {
            // Flip labels near the right edge so they don't clip.
            const cx = px(s.lon);
            const rightSide = cx > width * 0.66;
            // Per-station nudges to separate crowded northern labels
            // (Kinlochbervie's long name points east toward Wick).
            const dy = LABEL_DY[s.id] ?? 0;
            return (
              <SvgText
                key={`${s.id}-label`}
                x={rightSide ? cx - 9 : cx + 9}
                y={py(s.lat) + 3.5 + dy}
                fill={palette.text}
                fontSize={10}
                fontWeight={s.id === selectedId ? '700' : '400'}
                textAnchor={rightSide ? 'end' : 'start'}
                stroke={sea}
                strokeWidth={s.id === selectedId ? 0 : 0.4}
              >
                {s.name}
              </SvgText>
            );
          })}
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
    padding: 0,
  },
  noteText: { position: 'absolute', right: 10, bottom: 8, fontSize: 10 },
});
