// Shared plot geometry for the day charts (tide + tidal stream): padding, the
// time→x scale, 6-hourly tick marks and the "now" x-position. The y-axis is
// left to each chart (tide = height range; stream = signed rate around zero).
//
// A plain function, not a hook, so it can be called after each chart's
// "not enough data" early return without breaking the rules of hooks.

export const CHART_PAD = { left: 30, right: 10, top: 14, bottom: 22 } as const;

export interface ChartFrame {
  plotW: number;
  plotH: number;
  /** Map a time (ms) to an x pixel. */
  x: (t: number) => number;
  /** Tick marks every 6 h across the plotted span. */
  hourTicks: { t: number; label: string }[];
  /** x of the "now" line, or null when now is outside the span. */
  nowX: number | null;
}

export function chartFrame(
  width: number,
  { t0, t1, height, now }: { t0: number; t1: number; height: number; now?: Date },
): ChartFrame {
  const plotW = Math.max(width - CHART_PAD.left - CHART_PAD.right, 1);
  const plotH = height - CHART_PAD.top - CHART_PAD.bottom;
  const x = (t: number) => CHART_PAD.left + ((t - t0) / (t1 - t0)) * plotW;

  const hourTicks: { t: number; label: string }[] = [];
  for (let k = 0; k <= 24; k += 6) {
    const t = t0 + k * 3600_000;
    if (t <= t1 + 1) {
      hourTicks.push({ t, label: String(k % 24).padStart(2, '0') });
    }
  }

  const nowX = now && now.getTime() >= t0 && now.getTime() <= t1 ? x(now.getTime()) : null;

  return { plotW, plotH, x, hourTicks, nowX };
}
