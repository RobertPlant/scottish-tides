import { expect, type Page, test } from '@playwright/test';

// The month / year trip planner (Plan tab). See smoke.spec.ts for the RN-Web
// quirks these assertions work around (clamped text → toBeAttached, hydration
// wait before synthetic events).

async function assertNoErrorOverlay(page: Page): Promise<void> {
  const text = await page.evaluate(() => document.body.innerText || '');
  expect(text, 'React error overlay present').not.toContain('indexed property');
  expect(text, 'uncaught error rendered').not.toContain('Uncaught');
}

test('planner shows a month grid with the neap→spring legend', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/plan/oban');
  await expect(page.getByText('Oban').first()).toBeAttached();
  // Legend endpoints + the calendar weekday header prove the grid rendered.
  await expect(page.getByText('Neaps').first()).toBeAttached();
  await expect(page.getByText('Springs').first()).toBeAttached();
  await expect(page.getByText('Mon').first()).toBeAttached();

  await assertNoErrorOverlay(page);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('planner toggles to the year heatmap', async ({ page }) => {
  await page.goto('/plan/oban');
  await page.waitForTimeout(1500); // let hydration attach the toggle's onPress
  await page.getByRole('button', { name: 'year' }).click();
  // The 12 month-row labels are unique to the year view.
  await expect(page.getByText('Jan').first()).toBeAttached();
  await expect(page.getByText('Dec').first()).toBeAttached();

  await assertNoErrorOverlay(page);
});

test('tapping a day opens it on the Tides tab', async ({ page }) => {
  // The planner opens on the current month, so target the 15th of it (always a
  // valid mid-month day, no timezone edge). Long-date form for the assertion.
  const now = new Date();
  const the15th = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;
  const longDate = new Date(the15th).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  await page.goto('/plan/oban');
  await page.waitForTimeout(1500);
  // Day cells carry an aria-label of "<ymd>: <class>, <range> metres range".
  await page
    .getByRole('button', { name: new RegExp(`^${the15th}:`) })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`d=${the15th}`));
  await expect(page.locator('body')).toContainText(longDate);

  await assertNoErrorOverlay(page);
});
