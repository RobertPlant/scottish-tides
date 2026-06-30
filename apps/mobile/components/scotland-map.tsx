// A lightweight, fully-offline locator map. No map tiles: a schematic coastline
// (mainland + major islands) is drawn from hand-traced lat/lon polygons, with
// station pins (round) and/or tidal-race markers (numbered diamonds) projected
// on top. An equirectangular projection with longitude
// scaled by cos(latitude) keeps Scotland from looking squashed. Decorative — not
// for navigation.

import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

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

/** A tidal-race marker: shown as a numbered diamond, tied to a numbered list. */
export interface StreamMarker {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

export function ScotlandMap({
  stations = [],
  selectedId,
  onSelect,
  streams = [],
  selectedStreamId,
  onSelectStream,
}: {
  stations?: Station[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  /** Tidal races to overlay, drawn as numbered diamonds (1-based, in order). */
  streams?: StreamMarker[];
  selectedStreamId?: string;
  onSelectStream?: (id: string) => void;
}) {
  const palette = usePalette();
  const isDark = palette.background === '#06121d';
  const sea = isDark ? '#0a1c29' : '#d8e7f0';
  const land = isDark ? '#16302a' : '#cdd9cb';
  const coast = isDark ? '#2c4a44' : '#9fb09c';
  const halo = isDark ? '#06121d' : '#ffffff'; // label casing for contrast

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
                onPress={onSelect ? () => onSelect(s.id) : undefined}
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
            const lx = rightSide ? cx - 9 : cx + 9;
            const ly = py(s.lat) + 4 + dy;
            const anchor = rightSide ? 'end' : 'start';
            const weight = s.id === selectedId ? '700' : '600';
            return (
              <G key={`${s.id}-label`}>
                {/* Halo "casing" drawn first so the glyphs read on any background. */}
                <SvgText
                  x={lx}
                  y={ly}
                  fontSize={11}
                  fontWeight={weight}
                  textAnchor={anchor}
                  fill={halo}
                  stroke={halo}
                  strokeWidth={3}
                  strokeLinejoin="round"
                >
                  {s.name}
                </SvgText>
                <SvgText
                  x={lx}
                  y={ly}
                  fontSize={11}
                  fontWeight={weight}
                  textAnchor={anchor}
                  fill={palette.text}
                >
                  {s.name}
                </SvgText>
              </G>
            );
          })}
          {streams.map((st, i) => {
            // Numbered diamonds, tied to the numbered list below the map. A
            // diamond (vs the round station pins) reads as "race / hazard".
            const cx = px(st.lon);
            const cy = py(st.lat);
            const sel = st.id === selectedStreamId;
            const r = sel ? 11 : 9;
            const pts = `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
            return (
              <G
                key={`stream-${st.id}`}
                onPress={onSelectStream ? () => onSelectStream(st.id) : undefined}
              >
                <Polygon points={pts} fill={palette.low} stroke="#ffffff" strokeWidth={1.5} />
                <SvgText
                  x={cx}
                  y={cy + 4}
                  fontSize={11}
                  fontWeight="700"
                  textAnchor="middle"
                  fill="#ffffff"
                >
                  {i + 1}
                </SvgText>
              </G>
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
    // Scotland is tall and narrow (and Shetland pushes the top up to ~61°N), so
    // at full column width the map turns into a giant block on desktop. Cap it
    // and centre it — it's a locator, not a chart.
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
  },
  noteText: { position: 'absolute', right: 10, bottom: 8, fontSize: 10 },
});
