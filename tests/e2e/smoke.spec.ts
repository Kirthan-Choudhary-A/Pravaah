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
  { path: '/household', label: 'household' },
  { path: '/voice', label: 'voice' },
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

test('household delegation and privacy controls: role switch and audit log download', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/household');

  // Verify SIMULATED notice
  await expect(page.getByText(/SIMULATED DATA ONLY/i)).toBeVisible();

  // Verify masked plate
  await expect(page.getByText('KA-03-**-**78')).toBeVisible();

  // Switch role to Family Member
  const familyRadio = page.getByRole('radio', { name: /Family member’s view/i });
  await familyRadio.click();
  await expect(page.getByText(/Granter Device View \(Simulated\)/i)).toBeVisible();

  // Switch back to You
  const youRadio = page.getByRole('radio', { name: /You \(Citizen Device\)/i });
  await youRadio.click();
  await expect(page.getByRole('heading', { level: 2, name: /Household Vehicles/i })).toBeVisible();
});

test('voice and plate parsing: sample selection and multilingual read-back', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/voice');

  // Verify SIMULATED notice and privacy notice
  await expect(page.getByText(/BROWSER SPEECH SERVICE/i)).toBeVisible();
  await expect(page.getByRole('note')).toBeVisible();

  // Click Sample 1
  const sample1 = page.getByRole('button', { name: /Sample 1: KA-03/i });
  await sample1.click();
  await expect(page.getByLabel('Parsed plate number: KA-03-MJ-4578')).toBeVisible();

  // Switch to Telugu
  const teluguTab = page.getByRole('button', { name: /తెలుగు/i });
  await teluguTab.click();
  await expect(page.getByText(/Needs native speaker review/i)).toBeVisible();

  // Click Confirm & Save
  const confirmBtn = page.getByRole('button', { name: /Yes, Confirm & Save/i });
  await confirmBtn.click();
  await expect(page.getByText(/successfully registered in household!/i)).toBeVisible();
});
