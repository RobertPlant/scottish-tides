// Signed tidal-stream curve: flood above the zero (slack) line, ebb below.
// Slack = zero crossings; peaks are marked. Knots on the Y-axis, hours on X.

import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { usePalette } from '@/hooks/use-theme-color';
import { formatTime } from '@/lib/datetime';
import type { StreamSample } from '@/lib/streams';

interface Props {
  samples: StreamSample[];
  slacks: Date[];
  now?: Date;
  floodName: string;
  ebbName: string;
  height?: number;
}

const PAD_LEFT = 30;
const PAD_RIGHT = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 22;

export function StreamCurve({ samples, slacks, now, floodName, ebbName, height = 200 }: Props) {
  const palette = usePalette();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (samples.length < 2) {
    return <View style={{ height }} onLayout={onLayout} />;
  }

  const flood = palette.high;
  const ebb = palette.low;

  const t0 = samples[0].time.getTime();
  const t1 = samples[samples.length - 1].time.getTime();
  const maxRate = Math.max(...samples.map((s) => Math.abs(s.rate)), 0.5) * 1.1;

  const plotW = Math.max(width - PAD_LEFT - PAD_RIGHT, 1);
  const plotH = height - PAD_TOP - PAD_BOTTOM;
  const x = (t: number) => PAD_LEFT + ((t - t0) / (t1 - t0)) * plotW;
  const zeroY = PAD_TOP + plotH / 2;
  const y = (rate: number) => zeroY - (rate / maxRate) * (plotH / 2);

  const pts = samples.map((s) => ({ x: x(s.time.getTime()), r: s.rate }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${y(p.r).toFixed(1)}`).join(' ');
  // Two-tone fill: flood lobes (clamp >=0) and ebb lobes (clamp <=0), each back to zero.
  const floodArea = `M ${pts[0].x.toFixed(1)} ${zeroY} ${pts.map((p) => `L ${p.x.toFixed(1)} ${y(Math.max(p.r, 0)).toFixed(1)}`).join(' ')} L ${pts[pts.length - 1].x.toFixed(1)} ${zeroY} Z`;
  const ebbArea = `M ${pts[0].x.toFixed(1)} ${zeroY} ${pts.map((p) => `L ${p.x.toFixed(1)} ${y(Math.min(p.r, 0)).toFixed(1)}`).join(' ')} L ${pts[pts.length - 1].x.toFixed(1)} ${zeroY} Z`;

  // Y ticks at 0 and ±maxRate/2-ish.
  const tick = Math.max(Math.round((maxRate / 1.1) * 0.5 * 2) / 2, 0.5);
  const yTicks = [tick, 0, -tick];

  const hourTicks: { t: number; label: string }[] = [];
  for (let k = 0; k <= 24; k += 6) {
    const t = t0 + k * 3600_000;
    if (t <= t1 + 1) {
      hourTicks.push({ t, label: String(k % 24).padStart(2, '0') });
    }
  }

  const nowX = now && now.getTime() >= t0 && now.getTime() <= t1 ? x(now.getTime()) : null;

  return (
    <View style={{ height }} onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {yTicks.map((v) => (
            <G key={`y${v}`}>
              <Line
                x1={PAD_LEFT}
                y1={y(v)}
                x2={width - PAD_RIGHT}
                y2={y(v)}
                stroke={v === 0 ? palette.muted : palette.border}
                strokeWidth={1}
              />
              <SvgText x={PAD_LEFT - 4} y={y(v) + 3} fill={palette.muted} fontSize={9} textAnchor="end">
                {Math.abs(v).toFixed(1)}
              </SvgText>
            </G>
          ))}

          {hourTicks.map((tk) => (
            <SvgText
              key={`x${tk.label}`}
              x={x(tk.t)}
              y={height - 7}
              fill={palette.muted}
              fontSize={9}
              textAnchor="middle"
            >
              {tk.label}
            </SvgText>
          ))}

          <Path d={floodArea} fill={flood} opacity={0.18} />
          <Path d={ebbArea} fill={ebb} opacity={0.18} />
          <Path d={line} stroke={palette.text} strokeWidth={2} fill="none" />

          {nowX !== null && (
            <Line x1={nowX} y1={PAD_TOP} x2={nowX} y2={height - PAD_BOTTOM} stroke={palette.text} strokeWidth={1} strokeDasharray="3 3" />
          )}

          {slacks.map((s) => {
            const sx = x(s.getTime());
            if (sx < PAD_LEFT || sx > width - PAD_RIGHT) {
              return null;
            }
            return (
              <G key={s.toISOString()}>
                <Circle cx={sx} cy={zeroY} r={3.5} fill={palette.tint} />
                <SvgText x={sx} y={zeroY - 6} fill={palette.muted} fontSize={9} textAnchor="middle">
                  {formatTime(s)}
                </SvgText>
              </G>
            );
          })}

          {/* flood / ebb sense labels */}
          <SvgText x={width - PAD_RIGHT} y={PAD_TOP + 9} fill={flood} fontSize={9} textAnchor="end">
            {floodName} ▲
          </SvgText>
          <SvgText x={width - PAD_RIGHT} y={height - PAD_BOTTOM - 3} fill={ebb} fontSize={9} textAnchor="end">
            {ebbName} ▼
          </SvgText>
        </Svg>
      )}
    </View>
  );
}
