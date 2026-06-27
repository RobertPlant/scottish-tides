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
  await page.goto('/stations');
  await expect(page.locator('body')).toContainText('FAVOURITES');
  await page.reload();
  await expect(page.locator('body')).toContainText('FAVOURITES'); // persisted
});

test('streams: race list and detail render with the safety warning', async ({ page }) => {
  await page.goto('/streams');
  await expect(page.locator('body')).toContainText('not a tidal stream atlas');
  await expect(page.locator('body')).toContainText('Pentland Firth');
  await page.getByText('Pentland Firth').first().click();
  await expect(page.locator('body')).toContainText('Slack water');
  await expect(page.locator('body')).toContainText('Peak streams');
  await expect(page.locator('body')).toContainText('Not for navigation');
});

test.describe('tides near me', () => {
  test.use({ geolocation: { latitude: 58.2, longitude: -6.39 }, permissions: ['geolocation'] });

  test('geolocation jumps to the nearest station', async ({ page }) => {
    await page.goto('/stations');
    await page.waitForTimeout(800);
    await page.getByText('Tides near me').click();
    await expect(page).toHaveURL(/\/station\/stornoway/);
  });
});
