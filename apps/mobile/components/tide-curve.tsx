// Tide curve for a single day: filled height-vs-time area with high/low markers
// and an optional "now" line. Renders identically on web and native via
// react-native-svg.

import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { usePalette } from '@/hooks/use-theme-color';
import { formatTime } from '@/lib/datetime';
import type { TideEvent } from '@/lib/tides';

interface Props {
  series: { time: Date; height: number }[];
  events: TideEvent[];
  now?: Date;
  height?: number;
}

const PAD_X = 10;
const PAD_TOP = 18;
const PAD_BOTTOM = 22;

export function TideCurve({ series, events, now, height = 200 }: Props) {
  const palette = usePalette();
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (series.length < 2) {
    return <View style={{ height }} onLayout={onLayout} />;
  }

  const t0 = series[0].time.getTime();
  const t1 = series[series.length - 1].time.getTime();
  const heights = series.map((s) => s.height);
  let minH = Math.min(...heights);
  let maxH = Math.max(...heights);
  const span = Math.max(maxH - minH, 0.5);
  minH -= span * 0.12;
  maxH += span * 0.12;

  const plotW = Math.max(width - PAD_X * 2, 1);
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  const x = (t: number) => PAD_X + ((t - t0) / (t1 - t0)) * plotW;
  const y = (h: number) => PAD_TOP + (1 - (h - minH) / (maxH - minH)) * plotH;

  const line = series.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(s.time.getTime()).toFixed(1)} ${y(s.height).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(t1).toFixed(1)} ${(height - PAD_BOTTOM).toFixed(1)} L ${x(t0).toFixed(1)} ${(height - PAD_BOTTOM).toFixed(1)} Z`;

  // Interpolated height at `now` for the marker dot.
  let nowX: number | null = null;
  let nowY: number | null = null;
  if (now && now.getTime() >= t0 && now.getTime() <= t1) {
    nowX = x(now.getTime());
    let h = series[0].height;
    for (let i = 1; i < series.length; i++) {
      if (series[i].time.getTime() >= now.getTime()) {
        const a = series[i - 1];
        const b = series[i];
        const f = (now.getTime() - a.time.getTime()) / (b.time.getTime() - a.time.getTime());
        h = a.height + f * (b.height - a.height);
        break;
      }
    }
    nowY = y(h);
  }

  return (
    <View style={{ height }} onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Path d={area} fill={palette.accent} opacity={0.16} />
          <Path d={line} stroke={palette.accent} strokeWidth={2.5} fill="none" />
          {now && nowX !== null && (
            <Line
              x1={nowX}
              y1={PAD_TOP - 6}
              x2={nowX}
              y2={height - PAD_BOTTOM}
              stroke={palette.muted}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}
          {now && nowX !== null && nowY !== null && (
            <Circle cx={nowX} cy={nowY} r={4} fill={palette.text} />
          )}
          {events.map((e) => {
            const ex = x(e.time.getTime());
            if (ex < PAD_X || ex > width - PAD_X) {
              return null;
            }
            const ey = y(e.height);
            const color = e.type === 'high' ? palette.high : palette.low;
            return (
              <G key={e.time.toISOString()}>
                <Circle cx={ex} cy={ey} r={3.5} fill={color} />
                <SvgText
                  x={ex}
                  y={e.type === 'high' ? ey - 7 : ey + 14}
                  fill={palette.muted}
                  fontSize={10}
                  textAnchor="middle"
                >
                  {formatTime(e.time)}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      )}
    </View>
  );
}
