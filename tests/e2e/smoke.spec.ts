import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 },
];

const paths = [
  { path: '/', label: 'story' },
  { path: '/plan', label: 'plan' },
  { path: '/simulate', label: 'simulate' },
  { path: '/sources', label: 'sources' },
];

for (const vp of viewports) {
  for (const p of paths) {
    test(`smoke check on ${p.path} at ${vp.name}: renders cleanly, no console errors, no body overflow`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(p.path);

      // Verify SIMULATED notice
      const disclaimer = page.getByText(/Prototype on simulated data/i);
      await expect(disclaimer.first()).toBeVisible();

      // Verify no root horizontal overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalOverflow).toBe(false);
      expect(consoleErrors).toHaveLength(0);

      // Save screenshot
      await page.screenshot({
        path: `tests/e2e/screenshots/${p.label}-${vp.name}.png`,
        fullPage: false,
      });
    });
  }
}

test('interactive simulator: curveball injection and URL sync', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/simulate');

  const curveballBtn = page.getByRole('button', { name: /RTO Slot Queue Delayed/i });
  await expect(curveballBtn).toBeVisible();

  await curveballBtn.click();
  await expect(curveballBtn).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/events=slotCollapse/);

  // Capture screenshot after curveball applied
  await page.screenshot({
    path: 'tests/e2e/screenshots/simulate-curveball-active.png',
    fullPage: false,
  });
});
