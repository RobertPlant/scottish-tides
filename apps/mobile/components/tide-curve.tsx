// Tide curve for a single day: filled height-vs-time area with a height axis,
// hour ticks, high/low markers and an optional "now" line. The high/low points
// are merged into the polyline so the markers always sit exactly on the curve.
// Renders identically on web and native via react-native-svg.

import { useState } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { usePalette } from '@/hooks/use-theme-color';
import { formatTime } from '@/lib/datetime';
import type { TideEvent } from '@/lib/tides';

interface Props {
  series: { time: Date; height: number }[];
  events: TideEvent[];
  now?: Date;
  height?: number;
  /** Allow tapping/dragging the chart to read the height at any time. */
  scrubbable?: boolean;
  /** Sunrise/sunset for the day; shades the daylight hours behind the curve. */
  sun?: { sunrise: Date | null; sunset: Date | null; alwaysUp?: boolean };
}

const PAD_LEFT = 30;
const PAD_RIGHT = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 22;

/** A "nice" axis step (1, 2, 5 × 10ⁿ) close to the requested size. */
function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const s = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
  return s * pow;
}

export function TideCurve({ series, events, now, height = 200, scrubbable = false, sun }: Props) {
  const palette = usePalette();
  const isDark = palette.background === '#06121d';
  const [width, setWidth] = useState(0);
  const [scrubT, setScrubT] = useState<number | null>(null);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (series.length < 2) {
    return <View style={{ height }} onLayout={onLayout} />;
  }

  const t0 = series[0].time.getTime();
  const t1 = series[series.length - 1].time.getTime();

  // Merge the exact high/low-water points into the sampled series so the drawn
  // line passes through each marker (the 10-min sampling otherwise cuts peaks).
  const merged = [
    ...series.map((s) => ({ t: s.time.getTime(), h: s.height })),
    ...events.map((e) => ({ t: e.time.getTime(), h: e.height })),
  ]
    .filter((p) => p.t >= t0 && p.t <= t1)
    .sort((a, b) => a.t - b.t);

  const hs = merged.map((p) => p.h);
  const dataMin = Math.min(...hs);
  const dataMax = Math.max(...hs);

  // Height axis ticks around the data range.
  const step = niceStep(Math.max((dataMax - dataMin) / 4, 0.1));
  const yMin = Math.floor(dataMin / step) * step;
  const yMax = Math.ceil(dataMax / step) * step;
  const decimals = step < 1 ? 1 : 0;
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + 1e-9; v += step) {
    yTicks.push(Number(v.toFixed(4)));
  }

  const plotW = Math.max(width - PAD_LEFT - PAD_RIGHT, 1);
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  const x = (t: number) => PAD_LEFT + ((t - t0) / (t1 - t0)) * plotW;
  const y = (h: number) => PAD_TOP + (1 - (h - yMin) / (yMax - yMin)) * plotH;
  const baseY = y(yMin);

  // Daylight band (sun above the horizon), clamped to the plotted day, plus
  // crisp sunrise/sunset edge lines so dawn/dusk read even near midsummer when
  // the band fills most of the chart.
  let dayBand: { x0: number; x1: number } | null = null;
  const dayEdges: number[] = [];
  if (sun) {
    if (sun.alwaysUp) {
      dayBand = { x0: x(t0), x1: x(t1) };
    } else if (sun.sunrise && sun.sunset) {
      const sr = sun.sunrise.getTime();
      const ss = sun.sunset.getTime();
      const s0 = Math.max(sr, t0);
      const s1 = Math.min(ss, t1);
      if (s1 > s0) {
        dayBand = { x0: x(s0), x1: x(s1) };
        if (sr > t0 && sr < t1) dayEdges.push(x(sr));
        if (ss > t0 && ss < t1) dayEdges.push(x(ss));
      }
    }
  }
  const dayFill = '#ffcf4d'; // warm gold, theme-agnostic
  const dayEdge = '#e0a020'; // deeper gold for the dawn/dusk lines

  const line = merged
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.t).toFixed(1)} ${y(p.h).toFixed(1)}`)
    .join(' ');
  const area = `${line} L ${x(t1).toFixed(1)} ${baseY.toFixed(1)} L ${x(t0).toFixed(1)} ${baseY.toFixed(1)} Z`;

  // Hour ticks every 6 h across the day.
  const hourTicks: { t: number; label: string }[] = [];
  for (let k = 0; k <= 24; k += 6) {
    const t = t0 + k * 3600_000;
    if (t <= t1 + 1) {
      hourTicks.push({ t, label: String(k % 24).padStart(2, '0') });
    }
  }

  // Interpolated height at `now` for the marker dot.
  let nowX: number | null = null;
  let nowY: number | null = null;
  if (now && now.getTime() >= t0 && now.getTime() <= t1) {
    nowX = x(now.getTime());
    let h = merged[0].h;
    for (let i = 1; i < merged.length; i++) {
      if (merged[i].t >= now.getTime()) {
        const a = merged[i - 1];
        const b = merged[i];
        const f = (now.getTime() - a.t) / (b.t - a.t || 1);
        h = a.h + f * (b.h - a.h);
        break;
      }
    }
    nowY = y(h);
  }

  // Interpolate height + trend at an arbitrary time (for the scrub readout).
  const sampleAt = (tMs: number): { h: number; rising: boolean } => {
    for (let i = 1; i < merged.length; i++) {
      if (merged[i].t >= tMs) {
        const a = merged[i - 1];
        const b = merged[i];
        const f = (tMs - a.t) / (b.t - a.t || 1);
        return { h: a.h + f * (b.h - a.h), rising: b.h >= a.h };
      }
    }
    return { h: merged[merged.length - 1].h, rising: false };
  };

  const onScrub = (e: GestureResponderEvent) => {
    const lx = e.nativeEvent.locationX;
    const clampedX = Math.min(Math.max(lx, PAD_LEFT), width - PAD_RIGHT);
    setScrubT(t0 + ((clampedX - PAD_LEFT) / plotW) * (t1 - t0));
  };

  const scrub =
    scrubbable && scrubT !== null
      ? (() => {
          const { h, rising } = sampleAt(scrubT);
          return { sx: x(scrubT), sy: y(h), h, rising, time: new Date(scrubT) };
        })()
      : null;

  const responder = scrubbable
    ? {
        onStartShouldSetResponder: () => true,
        onResponderGrant: onScrub,
        onResponderMove: onScrub,
      }
    : {};

  return (
    <View style={{ height }} onLayout={onLayout} {...responder}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {/* Daylight band behind the grid (sun above the horizon) */}
          {dayBand && (
            <Rect
              x={dayBand.x0}
              y={PAD_TOP}
              width={Math.max(dayBand.x1 - dayBand.x0, 0)}
              height={plotH}
              fill={dayFill}
              opacity={isDark ? 0.16 : 0.3}
            />
          )}
          {dayEdges.map((ex) => (
            <Line
              key={`sun${ex.toFixed(0)}`}
              x1={ex}
              y1={PAD_TOP}
              x2={ex}
              y2={baseY}
              stroke={dayEdge}
              strokeWidth={1.5}
              strokeDasharray="2 2"
            />
          ))}

          {/* Height gridlines + axis labels */}
          {yTicks.map((v) => (
            <G key={`y${v}`}>
              <Line
                x1={PAD_LEFT}
                y1={y(v)}
                x2={width - PAD_RIGHT}
                y2={y(v)}
                stroke={palette.border}
                strokeWidth={1}
              />
              <SvgText
                x={PAD_LEFT - 4}
                y={y(v) + 3}
                fill={palette.muted}
                fontSize={9}
                textAnchor="end"
              >
                {v.toFixed(decimals)}
              </SvgText>
            </G>
          ))}

          {/* Hour ticks + labels */}
          {hourTicks.map((tick) => (
            <G key={`x${tick.t}`}>
              <Line
                x1={x(tick.t)}
                y1={PAD_TOP}
                x2={x(tick.t)}
                y2={baseY}
                stroke={palette.border}
                strokeWidth={1}
                opacity={0.5}
              />
              <SvgText
                x={x(tick.t)}
                y={height - 7}
                fill={palette.muted}
                fontSize={9}
                textAnchor="middle"
              >
                {tick.label}
              </SvgText>
            </G>
          ))}

          {/* Tide curve */}
          <Path d={area} fill={palette.accent} opacity={0.16} />
          <Path d={line} stroke={palette.accent} strokeWidth={2.5} fill="none" />

          {/* Now marker */}
          {now && nowX !== null && (
            <Line
              x1={nowX}
              y1={PAD_TOP - 4}
              x2={nowX}
              y2={baseY}
              stroke={palette.text}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}
          {now && nowX !== null && nowY !== null && (
            <Circle cx={nowX} cy={nowY} r={4} fill={palette.text} />
          )}

          {/* High/low water markers */}
          {events.map((e) => {
            const ex = x(e.time.getTime());
            if (ex < PAD_LEFT || ex > width - PAD_RIGHT) {
              return null;
            }
            const ey = y(e.height);
            const color = e.type === 'high' ? palette.high : palette.low;
            return (
              <G key={e.time.toISOString()}>
                <Circle cx={ex} cy={ey} r={3.5} fill={color} />
                <SvgText
                  x={ex}
                  y={e.type === 'high' ? ey - 6 : ey + 13}
                  fill={palette.muted}
                  fontSize={9}
                  textAnchor="middle"
                >
                  {formatTime(e.time)}
                </SvgText>
              </G>
            );
          })}

          {/* Scrub marker */}
          {scrub && (
            <G>
              <Line
                x1={scrub.sx}
                y1={PAD_TOP - 4}
                x2={scrub.sx}
                y2={baseY}
                stroke={palette.accent}
                strokeWidth={1}
              />
              <Circle
                cx={scrub.sx}
                cy={scrub.sy}
                r={4.5}
                fill={palette.accent}
                stroke={palette.surface}
                strokeWidth={1.5}
              />
            </G>
          )}
        </Svg>
      )}
      {scrub && (
        <View
          style={[
            styles.readout,
            {
              left: Math.min(Math.max(scrub.sx - 52, 2), Math.max(width - 106, 2)),
              backgroundColor: palette.tint,
            },
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.readoutText, { color: palette.background }]}>
            {formatTime(scrub.time)} · {scrub.h.toFixed(2)} m {scrub.rising ? '▲' : '▼'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  readout: {
    position: 'absolute',
    top: 0,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 104,
    alignItems: 'center',
  },
  readoutText: { fontSize: 12, fontWeight: '700' },
});
