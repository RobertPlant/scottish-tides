// Reference high/low waters from tidetimes.org.uk (UKHO-derived), shared by
// verify-tidetimes.ts and calibrate-shift.ts. Pages are cached in tools/.cache.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ukDayStartFromYmd, ymdAddDays, ymdInUk } from '../apps/mobile/lib/datetime';
import type { TideEvent, TideEventType } from '../apps/mobile/lib/tides';

// Our station id -> tidetimes slug. Port Ellen isn't on tidetimes; its nearest
// port there is Port Askaig, in the Sound of Islay, which has a different tide.
export const SLUGS: Record<string, string | null> = {
  millport: 'millport',
  portpatrick: 'portpatrick',
  oban: 'oban',
  tobermory: 'tobermory',
  'port-ellen': null,
  stornoway: 'stornoway',
  ullapool: 'ullapool',
  kinlochbervie: 'loch-bervie',
  lerwick: 'lerwick',
  wick: 'wick',
  aberdeen: 'aberdeen',
  leith: 'leith',
};

const CACHE = path.join(path.dirname(fileURLToPath(import.meta.url)), '.cache', 'tidetimes');
const ROW =
  /<tr class="(vis\d)">\s*<td class="tal">(High|Low)<\/td>\s*<td class="tac"><span>(\d\d):(\d\d)<\/span><\/td>\s*<td class="tar">([\d.]+)m/g;

export interface RefEvent {
  type: TideEventType;
  time: Date;
  height: number;
}

// How far ahead the site publishes dated pages; skip fetching beyond it.
const PUBLISHED_AHEAD_DAYS = 7;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** "1st December 2025", as the page title words the date it is for. */
function titleDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const ord =
    d % 10 === 1 && d !== 11
      ? 'st'
      : d % 10 === 2 && d !== 12
        ? 'nd'
        : d % 10 === 3 && d !== 13
          ? 'rd'
          : 'th';
  const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-GB', {
    month: 'long',
    timeZone: 'UTC',
  });
  return `${d}${ord} ${month} ${y}`;
}

/**
 * The UK day's reference events, from the cache or the site, or `null` if the
 * site doesn't publish that day. Past about a week ahead it silently serves
 * today's page instead, so a fetched page only counts, and is only cached, if
 * its title names the date (today's own page is undated).
 */
export async function reference(slug: string, ymd: string): Promise<RefEvent[] | null> {
  mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, `${slug}-${ymd}.html`);
  let html: string;
  if (existsSync(file)) {
    html = readFileSync(file, 'utf8');
  } else if (ymd > ymdAddDays(ymdInUk(new Date()), PUBLISHED_AHEAD_DAYS)) {
    return null;
  } else {
    const url = `https://www.tidetimes.org.uk/${slug}-tide-times-${ymd.replaceAll('-', '')}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'scottish-tides verify script' } });
    if (!res.ok) {
      throw new Error(`${url}: HTTP ${res.status}`);
    }
    html = await res.text();
    await sleep(1000);
    const title = html.match(/<title>([^<]*)/)?.[1] ?? '';
    if (!title.includes(` for ${titleDate(ymd)} `) && ymd !== ymdInUk(new Date())) {
      return null;
    }
    writeFileSync(file, html);
  }
  const rows = [...html.matchAll(ROW)];
  // In BST the page lists the day twice: vis2 in BST, vis0 in GMT. Otherwise
  // only vis2, already GMT.
  const cls = rows.some((r) => r[1] === 'vis0') ? 'vis0' : 'vis2';
  const start = ukDayStartFromYmd(ymd);
  const startMin = start.getUTCHours() * 60 + start.getUTCMinutes();
  return rows
    .filter((r) => r[1] === cls)
    .map((r) => {
      // GMT clock time -> instant within the UK day (which starts at 23:00 GMT in BST).
      const sinceStart = (Number(r[3]) * 60 + Number(r[4]) - startMin + 1440) % 1440;
      return {
        type: r[2] === 'High' ? 'high' : 'low',
        time: new Date(start.getTime() + sinceStart * 60_000),
        height: Number(r[5]),
      };
    });
}

export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** The nearest event of `r`'s type, and how many minutes after `r` it is. */
export function nearestSameType<E extends RefEvent | TideEvent>(
  r: RefEvent,
  events: E[],
): { e: E; d: number } | undefined {
  return events
    .filter((e) => e.type === r.type)
    .map((e) => ({ e, d: (e.time.getTime() - r.time.getTime()) / 60_000 }))
    .sort((a, b) => Math.abs(a.d) - Math.abs(b.d))[0];
}
