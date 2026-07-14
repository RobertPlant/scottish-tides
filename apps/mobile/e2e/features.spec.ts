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
