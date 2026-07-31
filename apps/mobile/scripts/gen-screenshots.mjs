// Regenerates the F-Droid / fastlane phone screenshots.
//
//   npm run screenshots              (exports the web build, then captures)
//   SKIP_EXPORT=1 npm run screenshots   (reuse the existing dist/)
//
// Deliberately shoots the PRODUCTION export rather than the Metro dev server:
// in dev, React Native's LogBox paints a red error toast over the UI and it
// ends up baked into the store screenshots. The web build is the same React
// tree as the native app, so this is a fair representation of the Android UI —
// and an emulator won't fit on the low-memory builder box anyway.

import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const MOBILE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(MOBILE_DIR, 'dist');
const OUT_DIR = path.resolve(
  MOBILE_DIR,
  '../../fastlane/metadata/android/en-US/images/phoneScreenshots',
);
const PORT = 8099;

// app.json sets experiments.baseUrl, so the export's asset paths are all
// prefixed — serve it under that prefix or nothing loads.
const BASE_PATH = '/scottish-tides';
const BASE_URL = `http://localhost:${PORT}${BASE_PATH}`;

// A typical Android phone. deviceScaleFactor 2 keeps text crisp without
// exceeding F-Droid's 3840 px cap. en-GB so <input type=date> isn't US-format.
const VIEWPORT = { width: 412, height: 915 };
const LOCALE = 'en-GB';

const SHOTS = [
  { file: '1-tides.png', url: '/station/leith', wait: 'High water' },
  { file: '2-map.png', url: '/map', wait: 'Tides near me' },
  { file: '3-plan.png', url: '/plan/oban', wait: /neap/i },
  { file: '4-streams.png', url: '/stream/corryvreckan', wait: /not for navigation/i },
  { file: '5-about.png', url: '/about', wait: /General Public License/i },
];

// The export writes one .html per route, but expo-router only matches
// extensionless paths — hitting /map.html renders "Unmatched Route". GitHub
// Pages resolves the suffix server-side, so do the same here.
const HTML_FALLBACK_SERVER = `
import http.server, os, sys
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, p):
        f = super().translate_path(p)
        return f + '.html' if not os.path.exists(f) and os.path.exists(f + '.html') else f
    def log_message(self, *a): pass
http.server.test(HandlerClass=H, port=int(sys.argv[1]), bind='127.0.0.1')
`;

/** The nixpkgs chrome-headless-shell, when devenv provided one. */
function nixChrome() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root) {
    return undefined;
  }
  const found = execSync(`find ${root} -name chrome-headless-shell -type f | head -1`)
    .toString()
    .trim();
  return found || undefined;
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) {
        return;
      }
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`static server never came up at ${url}`);
}

if (!process.env.SKIP_EXPORT) {
  console.log('→ expo export --platform web …');
  execSync('node_modules/.bin/expo export --platform web', {
    cwd: MOBILE_DIR,
    stdio: 'inherit',
    // Metro is the memory hog on the builder box; cap its heap.
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=1024' },
  });
}
if (!existsSync(DIST)) {
  throw new Error(`no export at ${DIST} — drop SKIP_EXPORT`);
}

// Serve dist/ under BASE_PATH via a symlink, the way Pages does.
const serveRoot = mkdtempSync(path.join(tmpdir(), 'st-shots-'));
symlinkSync(DIST, path.join(serveRoot, BASE_PATH.slice(1)));
const server = spawn('python3', ['-c', HTML_FALLBACK_SERVER, String(PORT)], {
  cwd: serveRoot,
  stdio: 'ignore',
});
await waitForServer(`${BASE_URL}/index.html`, 30_000);

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

// Chrome renders <input type=date> in its UI locale, not the page's, so the
// date field comes out as US mm/dd/yyyy unless the browser process itself is
// en-GB. It's LANG that decides this — `--lang` alone does nothing here.
const browser = await chromium.launch({
  executablePath: nixChrome(),
  args: [`--lang=${LOCALE}`],
  env: { ...process.env, LANG: 'en_GB.UTF-8', LC_ALL: 'en_GB.UTF-8' },
});
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2, locale: LOCALE });

try {
  for (const shot of SHOTS) {
    console.log(`→ ${shot.file}  ${shot.url}`);
    await page.goto(`${BASE_URL}${shot.url}`, { waitUntil: 'networkidle' });
    await page.getByText(shot.wait).first().waitFor({ state: 'attached', timeout: 30_000 });
    // Let the tide curve finish its first paint.
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT_DIR, shot.file) });
  }
} finally {
  await browser.close();
  server.kill();
  rmSync(serveRoot, { recursive: true, force: true });
}

console.log(`\n✔ ${SHOTS.length} screenshots in ${OUT_DIR}`);
