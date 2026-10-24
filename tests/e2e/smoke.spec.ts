import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'mobile (390px)', width: 390, height: 844 },
  { name: 'desktop (1280px)', width: 1280, height: 800 },
];

for (const vp of viewports) {
  test(`smoke check on / at ${vp.name}: no console errors, no horizontal overflow`, async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');

    await expect(page.locator('h1')).toHaveText('Story');

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
    expect(consoleErrors).toHaveLength(0);
  });
}
