// A lightweight, fully-offline locator map. No map tiles: a schematic coastline
// (mainland + major islands) is drawn from hand-traced lat/lon polygons, with
// station pins (round) and/or tidal-race markers (numbered diamonds) projected
// on top. An equirectangular projection with longitude scaled by cos(latitude)
// keeps Scotland from looking squashed. Pinch / drag (or the +/- buttons) to
// zoom — useful for the tightly-clustered Argyll races. Decorative, not for
// navigation.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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

const MAX_ZOOM = 8;

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

interface ViewState {
  k: number; // zoom factor
  x: number; // screen-space translation applied after scaling
  y: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

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
  const height = width * ASPECT;
  const sizeRef = useRef({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    sizeRef.current = { w, h: w * ASPECT };
    setWidth(w);
  };

  // Zoom/pan. screen = base·k + (x, y); base is the un-zoomed projection.
  const [view, setViewState] = useState<ViewState>({ k: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  const clampView = useCallback((v: ViewState): ViewState => {
    const k = clamp(v.k, 1, MAX_ZOOM);
    const { w, h } = sizeRef.current;
    // Keep the scaled content covering the frame (no empty gutters).
    return { k, x: clamp(v.x, w * (1 - k), 0), y: clamp(v.y, h * (1 - k), 0) };
  }, []);
  const setView = useCallback(
    (v: ViewState) => {
      const c = clampView(v);
      viewRef.current = c;
      setViewState(c);
    },
    [clampView],
  );

  // Zoom around a focal point (screen px), keeping that point stationary.
  const zoomAround = useCallback(
    (factor: number, fx: number, fy: number) => {
      const v = viewRef.current;
      const k = clamp(v.k * factor, 1, MAX_ZOOM);
      setView({ k, x: fx - (fx - v.x) * (k / v.k), y: fy - (fy - v.y) * (k / v.k) });
    },
    [setView],
  );

  // Scroll-wheel / trackpad zoom on web. View props don't forward onWheel, so
  // attach a non-passive DOM listener to the frame element and zoom around the
  // cursor, preventing the page from scrolling while pointing at the map.
  const frameRef = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    const el = frameRef.current as unknown as HTMLElement | null;
    if (!el) {
      return;
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAround(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAround]);

  const start = useRef<ViewState & { fx: number; fy: number }>({ k: 1, x: 0, y: 0, fx: 0, fy: 0 });
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(8)
      .runOnJS(true)
      .onStart(() => {
        start.current = { ...viewRef.current, fx: 0, fy: 0 };
      })
      .onUpdate((e) => {
        const s = start.current;
        setView({ k: s.k, x: s.x + e.translationX, y: s.y + e.translationY });
      });
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart((e) => {
        start.current = { ...viewRef.current, fx: e.focalX, fy: e.focalY };
      })
      .onUpdate((e) => {
        const s = start.current;
        const k = clamp(s.k * e.scale, 1, MAX_ZOOM);
        setView({ k, x: s.fx - (s.fx - s.x) * (k / s.k), y: s.fy - (s.fy - s.y) * (k / s.k) });
      });
    return Gesture.Race(pinch, pan);
  }, [setView]);

  const px = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * width;
  const py = (lat: number) => (1 - (lat - LAT0) / (LAT1 - LAT0)) * height;
  const sx = (lon: number) => px(lon) * view.k + view.x;
  const sy = (lat: number) => py(lat) * view.k + view.y;

  // The coastline is the heavy part (47 rings); it only depends on size + colour,
  // not on the live zoom (which is just a transform on the wrapping <G>).
  const coastPaths = useMemo(() => {
    if (width === 0) {
      return null;
    }
    const h = width * ASPECT;
    const projX = (lon: number) => ((lon - LON0) / (LON1 - LON0)) * width;
    const projY = (lat: number) => (1 - (lat - LAT0) / (LAT1 - LAT0)) * h;
    const ringPath = (ring: [number, number][]) =>
      `${ring
        .map(
          ([lon, lat], i) =>
            `${i === 0 ? 'M' : 'L'} ${projX(lon).toFixed(1)} ${projY(lat).toFixed(1)}`,
        )
        .join(' ')} Z`;
    return COAST.map((ring, i) => (
      <Path key={i} d={ringPath(ring)} fill={land} stroke={coast} strokeWidth={0.5} />
    ));
  }, [width, land, coast]);

  const canReset = view.k > 1;

  return (
    <View
      ref={frameRef}
      style={[styles.frame, { borderColor: palette.border, backgroundColor: sea }]}
      onLayout={onLayout}
    >
      {width > 0 && (
        <GestureDetector gesture={gesture}>
          <Svg width={width} height={height}>
            <Rect x={0} y={0} width={width} height={height} fill={sea} />
            <G transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>{coastPaths}</G>
            {stations.map((s) => {
              const selected = s.id === selectedId;
              return (
                <Circle
                  key={s.id}
                  cx={sx(s.lon)}
                  cy={sy(s.lat)}
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
              const cx = sx(s.lon);
              const rightSide = cx > width * 0.66;
              const dy = LABEL_DY[s.id] ?? 0;
              const lx = rightSide ? cx - 9 : cx + 9;
              const ly = sy(s.lat) + 4 + dy;
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
              const cx = sx(st.lon);
              const cy = sy(st.lat);
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
        </GestureDetector>
      )}

      <View style={styles.zoomBar}>
        <ZoomButton
          label="+"
          onPress={() => zoomAround(1.6, width / 2, height / 2)}
          palette={palette}
        />
        <ZoomButton
          label="−"
          onPress={() => zoomAround(1 / 1.6, width / 2, height / 2)}
          palette={palette}
        />
        {canReset ? (
          <ZoomButton label="1×" onPress={() => setView({ k: 1, x: 0, y: 0 })} palette={palette} />
        ) : null}
      </View>

      <Text style={[styles.noteText, { color: palette.muted }]}>
        Schematic — not for navigation
      </Text>
    </View>
  );
}

function ZoomButton({
  label,
  onPress,
  palette,
}: {
  label: string;
  onPress: () => void;
  palette: ReturnType<typeof usePalette>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.zoomBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <Text style={[styles.zoomBtnText, { color: palette.text }]}>{label}</Text>
    </Pressable>
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
    maxWidth: 460,
    alignSelf: 'center',
  },
  noteText: { position: 'absolute', right: 10, bottom: 8, fontSize: 10, pointerEvents: 'none' },
  zoomBar: { position: 'absolute', top: 8, right: 8, gap: 6, pointerEvents: 'box-none' },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: { fontSize: 20, fontWeight: '700', lineHeight: 22 },
});
