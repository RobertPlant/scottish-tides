import { expect, type Page, test } from '@playwright/test';

// The trip planner (Plan tab): a whole-year heatmap. See smoke.spec.ts for the
// RN-Web quirks these assertions work around (clamped text → toBeAttached,
// hydration wait before synthetic events).

async function assertNoErrorOverlay(page: Page): Promise<void> {
  const text = await page.evaluate(() => document.body.innerText || '');
  expect(text, 'React error overlay present').not.toContain('indexed property');
  expect(text, 'uncaught error rendered').not.toContain('Uncaught');
}

test('planner shows the year heatmap with the neap→spring legend', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

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
  await page.waitForTimeout(1500); // let hydration attach the cell's onPress
  // Day cells carry an aria-label of "<ymd>: <class>, <range> metres range".
  await page
    .getByRole('button', { name: new RegExp(`^${the15th}:`) })
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
  await page.waitForTimeout(1500);
  await page.getByRole('tab', { name: /Plan/ }).first().click();
  await page.waitForTimeout(1500);
  await page
    .getByRole('button', { name: new RegExp(`^${ymd}:`) })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`d=${ymd}`));
  await expect(page.locator('body')).toContainText(longDate);

  await assertNoErrorOverlay(page);
});
