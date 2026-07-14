import { expect, test } from '@playwright/test';

test('a shareable ?d= link opens that day', async ({ page }) => {
  await page.goto('/station/oban?d=2026-07-04');
  await page.waitForTimeout(800); // dev hydration reads the query param
  await expect(page.locator('body')).toContainText('4 July 2026');
});

test('favouriting a station persists and pins it', async ({ page }) => {
  await page.goto('/station/leith');
  await page.waitForTimeout(800);
  await page.getByText('☆').first().click(); // star it
  await page.goto('/map');
  await expect(page.locator('body')).toContainText('FAVOURITES');
  await page.reload();
  await expect(page.locator('body')).toContainText('FAVOURITES'); // persisted
});

test('streams: race list and detail render with the safety warning', async ({ page }) => {
  await page.goto('/map');
  await expect(page.locator('body')).toContainText('not a tidal stream atlas');
  await expect(page.locator('body')).toContainText('Pentland Firth');
  // In dev the click can land before expo-router has hydrated the Link (the text is
  // in the static HTML but the client handler isn't wired up yet), so the tap is a
  // no-op. Retry the click until the route actually changes.
  await expect(async () => {
    if (!/\/stream\//.test(page.url())) {
      await page.getByText('Pentland Firth').first().click({ timeout: 2000 });
    }
    await expect(page).toHaveURL(/\/stream\//, { timeout: 2000 });
  }).toPass({ timeout: 30_000 });
  await expect(page.locator('body')).toContainText('Slack water', { timeout: 15_000 });
  await expect(page.locator('body')).toContainText('Peak streams');
  await expect(page.locator('body')).toContainText('Not for navigation');
});

test('swipe left/right changes the day', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await page.goto('/station/oban?d=2026-07-14');
  await page.waitForTimeout(1500); // hydrate so the pan responder is live
  await expect(page.locator('body')).toContainText('14 July 2026');

  // Drag horizontally across the sun/moon card — a non-chart, non-pressable
  // area, so the day-view pan responder handles it (the chart keeps its scrub,
  // and the week-day rows keep their tap-to-select).
  const swipe = async (dir: 'left' | 'right') => {
    const card = page.getByText('Daylight', { exact: false }).first();
    await card.scrollIntoViewIfNeeded();
    const b = await card.boundingBox();
    if (!b) throw new Error('sun/moon card not found');
    const y = b.y + b.height / 2;
    const [fromX, toX] = dir === 'left' ? [340, 110] : [110, 340];
    await page.mouse.move(fromX, y);
    await page.mouse.down();
    await page.mouse.move((fromX + toX) / 2, y, { steps: 5 });
    await page.mouse.move(toX, y, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(300);
  };

  await swipe('left'); // → next day
  await expect(page).toHaveURL(/d=2026-07-15/);
  await expect(page.locator('body')).toContainText('15 July 2026');

  await swipe('right'); // → previous day, back to the 14th
  await expect(page).toHaveURL(/d=2026-07-14/);
  await expect(page.locator('body')).toContainText('14 July 2026');
});

test('tapping the chart shows the scrub readout', async ({ page }) => {
  await page.goto('/station/oban?d=2026-07-14');
  await page.waitForTimeout(1500); // hydrate so the chart responder is live

  // The readout is "HH:MM · X.XX m ▲/▼" — the time prefix distinguishes it from
  // the (untimed) current-level pill. It only exists once you touch the chart.
  const readout = page.getByText(/\d{2}:\d{2} · \d+\.\d{2} m [▲▼]/);
  await expect(readout).toHaveCount(0);

  const chart = page.locator('svg').first();
  const box = await chart.boundingBox();
  if (!box) throw new Error('chart svg not found');
  const x = box.x + box.width * 0.5;
  const y = box.y + box.height * 0.55;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 8, y); // nudge so onResponderMove fires the readout
  await page.mouse.up();

  await expect(readout.first()).toBeAttached();
});

test('about screen: reached from the map, shows licence, credits and disclaimer', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/map');
  await page.waitForTimeout(800); // let the dev bundle hydrate before pressing
  await page.getByText('About & data sources', { exact: false }).first().click();
  await expect(page).toHaveURL(/\/about/);

  const body = page.locator('body');
  await expect(body).toContainText('GNU General Public License');
  await expect(body).toContainText('View the source on GitHub');
  await expect(body).toContainText('DATA & CREDITS');
  await expect(body).toContainText('British Oceanographic Data Centre'); // tide-data credit
  await expect(body).toContainText('Natural Earth'); // coastline credit
  await expect(body).toContainText('Disclaimer');

  expect(errors, errors.join('\n')).toEqual([]);
});

test('about screen: renders on direct load (refresh-safe)', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByText('Scottish Tides').first()).toBeAttached();
  await expect(page.locator('body')).toContainText('GNU General Public License');
});

test.describe('tides near me', () => {
  test.use({ geolocation: { latitude: 58.2, longitude: -6.39 }, permissions: ['geolocation'] });

  test('geolocation jumps to the nearest station', async ({ page }) => {
    await page.goto('/map');
    await page.waitForTimeout(800);
    await page.getByText('Tides near me').click();
    await expect(page).toHaveURL(/\/station\/stornoway/);
  });
});
