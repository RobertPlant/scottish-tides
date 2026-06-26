// A lightweight, fully-offline locator map. No map tiles: a schematic coastline
// (mainland + major islands) is drawn from hand-traced lat/lon polygons, with
// station pins projected on top. An equirectangular projection with longitude
// scaled by cos(latitude) keeps Scotland from looking squashed. Decorative — not
// for navigation.

import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect, Circle, Text as SvgText } from 'react-native-svg';

import { usePalette } from '@/hooks/use-theme-color';
import type { Station } from '@/lib/stations';

const LON0 = -8.2;
const LON1 = -0.5;
const LAT0 = 54.4;
const LAT1 = 61.0;
const MID_LAT = (LAT0 + LAT1) / 2;
const LON_SCALE = Math.cos((MID_LAT * Math.PI) / 180);
// Undistorted aspect: 1° lat ≈ 111 km, 1° lon ≈ 111·cos(lat) km.
const ASPECT = (LAT1 - LAT0) / ((LON1 - LON0) * LON_SCALE);

type Ring = [number, number][]; // [lon, lat]

// Mainland, traced clockwise from the Mull of Galloway. Coarse but aims to read
// as Scotland: the Kintyre peninsula, the Moray Firth notch and the Tay/Forth.
const MAINLAND: Ring = [
  [-4.85, 54.63], [-5.18, 54.85], [-4.95, 55.05], [-4.65, 55.45], [-4.85, 55.95],
  [-5.0, 56.0], [-5.45, 55.85], [-5.7, 55.4], [-5.55, 55.32], [-5.4, 55.6],
  [-5.6, 56.0], [-5.3, 56.2], [-5.55, 56.5], [-5.35, 56.7], [-5.7, 57.0],
  [-5.85, 57.55], [-5.4, 57.9], [-5.0, 58.3], [-4.8, 58.55], [-4.0, 58.6],
  [-3.05, 58.65], [-3.2, 58.4], [-3.55, 58.15], [-4.0, 57.85], [-4.2, 57.62],
  [-3.6, 57.6], [-2.8, 57.7], [-1.85, 57.68], [-1.78, 57.5], [-2.05, 57.15],
  [-2.45, 56.75], [-2.55, 56.45], [-3.1, 56.35], [-2.78, 56.45], [-2.7, 56.2],
  [-3.15, 56.05], [-2.9, 55.95], [-2.05, 55.8], [-2.5, 55.3], [-3.1, 55.0],
  [-3.6, 54.92], [-4.85, 54.63],
];

// Major islands (each a rough closed ring), so island stations sit on land.
const ISLANDS: Ring[] = [
  // Outer Hebrides (Lewis / Harris / Uists / Barra)
  [[-6.3, 58.5], [-6.2, 58.2], [-6.85, 57.75], [-7.1, 57.4], [-7.45, 57.2],
   [-7.5, 56.9], [-7.3, 56.95], [-7.1, 57.3], [-6.8, 57.6], [-6.55, 57.95], [-6.3, 58.5]],
  // Skye
  [[-6.1, 57.0], [-6.4, 57.25], [-6.3, 57.5], [-5.9, 57.55], [-5.65, 57.35], [-6.0, 57.1], [-6.1, 57.0]],
  // Mull
  [[-5.7, 56.55], [-6.0, 56.62], [-6.35, 56.5], [-6.2, 56.3], [-5.85, 56.32], [-5.7, 56.55]],
  // Islay & Jura
  [[-6.1, 55.6], [-6.45, 55.7], [-6.5, 55.98], [-6.0, 56.12], [-5.9, 55.85], [-6.0, 55.65], [-6.1, 55.6]],
  // Arran (Clyde)
  [[-5.15, 55.45], [-5.35, 55.5], [-5.35, 55.7], [-5.15, 55.72], [-5.05, 55.58], [-5.15, 55.45]],
  // Orkney
  [[-3.4, 58.8], [-2.8, 58.85], [-2.6, 59.1], [-3.0, 59.25], [-3.35, 59.1], [-3.4, 58.8]],
  // Shetland
  [[-1.4, 59.85], [-1.05, 59.9], [-1.0, 60.4], [-1.2, 60.75], [-1.45, 60.6], [-1.3, 60.2], [-1.4, 59.85]],
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
  const isDark = palette.background === '#06121d';
  const sea = isDark ? '#0a1c29' : '#d8e7f0';
  const land = isDark ? '#16302a' : '#cdd9cb';
  const coast = isDark ? '#2c4a44' : '#9fb09c';

  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const height = width * ASPECT;
  const px = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * width;
  const py = (lat: number) => (1 - (lat - LAT0) / (LAT1 - LAT0)) * height;
  const ringPath = (ring: Ring) =>
    `${ring.map(([lon, lat], i) => `${i === 0 ? 'M' : 'L'} ${px(lon).toFixed(1)} ${py(lat).toFixed(1)}`).join(' ')} Z`;

  return (
    <View
      style={[styles.frame, { borderColor: palette.border, backgroundColor: sea }]}
      onLayout={onLayout}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          <Rect x={0} y={0} width={width} height={height} fill={sea} />
          {[MAINLAND, ...ISLANDS].map((ring, i) => (
            <Path key={i} d={ringPath(ring)} fill={land} stroke={coast} strokeWidth={1} />
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
            return (
              <SvgText
                key={`${s.id}-label`}
                x={rightSide ? cx - 9 : cx + 9}
                y={py(s.lat) + 3.5}
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
