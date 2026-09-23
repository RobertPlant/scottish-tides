import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const PORT = 8081;
const BASE_URL = `http://localhost:${PORT}`;

// On NixOS the nixpkgs-provided browser build can differ from the @playwright/test
// version's expected revision, which breaks normal browser resolution. When the
// devenv-set PLAYWRIGHT_BROWSERS_PATH is present, point Playwright straight at the
// nix chrome-headless-shell (executablePath bypasses the revision check). In CI
// (no such env var) Playwright uses its own downloaded browser.
function nixHeadlessShell(): string | undefined {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !fs.existsSync(root)) {
    return undefined;
  }
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    let names: string[];
    try {
      names = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      const p = path.join(dir, name);
      // statSync follows symlinks — the nix browsers dir links e.g.
      // chromium_headless_shell-1223 -> the real chromium store path.
      let st: fs.Stats;
      try {
        st = fs.statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        stack.push(p);
      } else if (name === 'chrome-headless-shell') {
        return p;
      }
    }
  }
  return undefined;
}

const executablePath = nixHeadlessShell();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // The static export, not `expo start --web`. The dev server renders every
  // route in the browser, so it cannot see the failures that only exist in the
  // shipped artifact — build-time-frozen tide data and missing <title> both got
  // to production past a green e2e run. `expo serve` hosts dist/ with the
  // export's own route manifest (clean URLs), so no extra dependency.
  webServer: {
    command: `node_modules/.bin/expo export --platform web && node_modules/.bin/expo serve --port ${PORT}`,
    url: BASE_URL,
    // Never reuse, not even locally: a `npm run web` left open on this port is
    // exactly the dev server this suite was moved off, and reusing it would
    // silently test that instead of the export. Playwright fails loudly if the
    // port is busy — free it (or stop the dev server) and re-run. The cost is
    // an export per run.
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: { BROWSER: 'none' },
  },
});
