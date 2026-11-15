import { expect, type Page, test } from '@playwright/test';

import { tapUntil } from './helpers';

// React Native Web quirks (see AGENTS.md):
// - text rendered with numberOfLines uses -webkit-box clamping, which Playwright
//   reports as hidden - assert with toBeAttached(), not toBeVisible().
// - expo-router keeps the anchor tab mounted under pushed Stack screens, so the
//   Home screen's content co-exists with a station detail; scope with .first().

async function assertNoErrorOverlay(page: Page): Promise<void> {
  const text = await page.evaluate(() => document.body.innerText || '');
  expect(text, 'React error overlay present').not.toContain('indexed property');
  expect(text, 'uncaught error rendered').not.toContain('Uncaught');
}

test('home shows the current level on the chart and station chips', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));

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
  // pushed station detail, so two date inputs exist - the detail is rendered last.
  const input = page.locator('input[type=date]').last();
  // Waiting for the input *is* waiting for hydration: DayNav (which owns it)
  // renders only behind the useHydrated gate, so it cannot exist until React has
  // taken over and attached onChange. This replaced a fixed 1.5 s sleep that
  // predated the gate and was aimed at the dev server.
  await expect(input).toBeVisible();

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

test('station detail: a date typed on the keyboard reaches the date field', async ({ page }) => {
  await page.goto('/station/oban');
  const input = page.locator('input[type=date]').last();
  await expect(input).toBeVisible();

  // chrome fires a change per year digit, so the field sees year 0002 on the way to the real one
  const year = String(new Date().getFullYear() + 1);
  const segments = new Map([
    ['day', '15'],
    ['month', '06'],
    ['year', year],
  ]);
  const order = await page.evaluate(() =>
    new Intl.DateTimeFormat(navigator.language)
      .formatToParts(new Date())
      .map(part => part.type)
      .filter(type => type !== 'literal'),
  );
  await input.focus();
  for (const type of order) {
    await page.keyboard.type(segments.get(type) ?? '');
  }

  await expect(input).toHaveValue(`${year}-06-15`);
  await expect(page.locator('body')).toContainText(`15 June ${year}`);
});

test('station detail: the chart is one named image and the day is announced', async ({ page }) => {
  await page.goto('/station/oban');
  await expect(page.locator('input[type=date]').last()).toBeVisible();

  const chart = page.getByRole('img', { name: /Tide height through the day/ }).last();
  await expect(chart).toBeAttached();
  await expect(chart).not.toHaveAttribute('tabindex');
  await expect(page.locator('[aria-live=polite]').last()).toContainText(/\d{4}/);
});

test('deep link to a station renders on direct load (refresh-safe routing)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('/station/leith');
  await expect(page.getByText('Leith').first()).toBeAttached();
  await expect(page.getByText(/Firth of Forth/).first()).toBeAttached();

  await assertNoErrorOverlay(page);
  expect(errors, errors.join('\n')).toEqual([]);
});

// the trip planner (Plan tab): a whole-year heatmap

test('planner shows the year heatmap with the neap→spring legend', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('/plan/oban');
  await expect(page.getByText('Oban').first()).toBeAttached();
  // The 12 month-row labels + the legend endpoints prove the heatmap rendered.
  await expect(page.getByText('Jan').first()).toBeAttached();
  await expect(page.getByText('Dec').first()).toBeAttached();
  await expect(page.getByText('Neaps').first()).toBeAttached();
  await expect(page.getByText('Springs').first()).toBeAttached();

  await assertNoErrorOverlay(page);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('tapping a day opens it on the Tides tab', async ({ page }) => {
  // Target the 15th of the current month (always a valid mid-month day, no
  // timezone edge). Long-date form for the assertion.
  const now = new Date();
  const the15th = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;
  const longDate = new Date(the15th).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  await page.goto('/plan/oban');
  // Day cells carry an aria-label of "<weekday> <long date>: <class>, <range> metres range".
  await page
    .getByRole('button', { name: new RegExp(` ${longDate}:`) })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`d=${the15th}`));
  await expect(page.locator('body')).toContainText(longDate);

  await assertNoErrorOverlay(page);
});

test('tapping a day opens it when the Tides tab is already open', async ({ page }) => {
  // the Tides tab stays mounted under the tab bar, so a new ?d= has to move it
  const now = new Date();
  const day = now.getDate() === 15 ? 16 : 15;
  const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${day}`;
  const longDate = new Date(ymd).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  await page.goto('/station/oban');
  await tapUntil(page, page.getByRole('tab', { name: /Plan/ }).first(), /\/plan\//);
  await tapUntil(page, page.getByRole('button', { name: new RegExp(` ${longDate}:`) }).first(), new RegExp(`d=${ymd}`));
  await expect(page.locator('body')).toContainText(longDate);

  // the Tides tab links without ?d=, which mustn't drop the day back to today
  await tapUntil(page, page.getByRole('tab', { name: /Plan/ }).first(), /\/plan\//);
  await tapUntil(page, page.getByRole('tab', { name: /Tides/ }).first(), /\/station\//);
  await expect(page.locator('body')).toContainText(longDate);

  await assertNoErrorOverlay(page);
});
