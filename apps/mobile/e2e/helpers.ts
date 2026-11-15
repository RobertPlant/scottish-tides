import { expect, type Locator, type Page } from '@playwright/test';

/** Wait for a station day view to hydrate: DayNav, and its date field, render only on the client. */
export async function waitForDayView(page: Page): Promise<void> {
  await expect(page.locator('input[type=date]').last()).toBeVisible();
}

/** Wait for the map to hydrate: its SVG waits for a client-side layout pass. */
export async function waitForMap(page: Page): Promise<void> {
  await expect(page.locator('svg circle').first()).toBeAttached();
}

/** Tap until the route moves, since links are no-ops until hydration wires them up. */
export async function tapUntil(page: Page, target: Locator, url: RegExp): Promise<void> {
  await expect(async () => {
    if (!url.test(page.url())) {
      await target.click({ timeout: 2000 });
    }
    await expect(page).toHaveURL(url, { timeout: 2000 });
  }).toPass({ timeout: 30_000 });
}
