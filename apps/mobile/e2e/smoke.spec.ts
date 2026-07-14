import { expect, type Page, test } from '@playwright/test';

// React Native Web quirks (see AGENTS.md):
// - text rendered with numberOfLines uses -webkit-box clamping, which Playwright
//   reports as hidden — assert with toBeAttached(), not toBeVisible().
// - expo-router keeps the anchor tab mounted under pushed Stack screens, so the
//   Home screen's content co-exists with a station detail; scope with .first().

async function assertNoErrorOverlay(page: Page): Promise<void> {
  const text = await page.evaluate(() => document.body.innerText || '');
  expect(text, 'React error overlay present').not.toContain('indexed property');
  expect(text, 'uncaught error rendered').not.toContain('Uncaught');
}

test('home shows the current level on the chart and station chips', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.getByText('Oban').first()).toBeAttached();
  // The current level + rising/falling trend now render on the chart's
  // now-marker (today only), e.g. "0.92 m ▼".
  await expect(page.getByText(/\d+\.\d\d m [▲▼]/).first()).toBeAttached();

  await assertNoErrorOverlay(page);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('map tab lists ports from around the coast', async ({ page }) => {
  await page.goto('/map');
  for (const name of ['Millport', 'Tobermory', 'Stornoway', 'Wick', 'Aberdeen', 'Leith']) {
    await expect(page.getByText(name, { exact: false }).first()).toBeAttached();
  }
  await assertNoErrorOverlay(page);
});

test('station detail: the date picker changes the day', async ({ page }) => {
  await page.goto('/station/oban');
  // The anchored Tides tab stays mounted (with its own date picker) beneath the
  // pushed station detail, so two date inputs exist — the detail is rendered last.
  const input = page.locator('input[type=date]').last();
  await expect(input).toBeVisible();
  // Let dev-mode hydration attach React's onChange before we dispatch a synthetic
  // edit (otherwise the event has no listener and state never updates).
  await page.waitForTimeout(1500);

  // fill() on type=date doesn't drive React's controlled onChange; set the value
  // via the native setter and dispatch input/change like a real edit.
  await input.evaluate((el: HTMLInputElement, v: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, '2026-12-25');
  await expect(input).toHaveValue('2026-12-25');
  await expect(page.locator('body')).toContainText('25 December 2026');

  await assertNoErrorOverlay(page);
});

test('deep link to a station renders on direct load (refresh-safe routing)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/station/leith');
  await expect(page.getByText('Leith').first()).toBeAttached();
  await expect(page.getByText(/Firth of Forth/).first()).toBeAttached();

  await assertNoErrorOverlay(page);
  expect(errors, errors.join('\n')).toEqual([]);
});
