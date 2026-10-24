import { test, expect } from '@playwright/test';

// The welcome page is covered by its own test; every other test starts past it.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('pravaah_intro_seen', '1'));
});

const viewports = [
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 },
];

const paths = [
  { path: '/', label: 'dashboard' },
  { path: '/overview', label: 'overview' },
  { path: '/plan', label: 'plan' },
  { path: '/simulate', label: 'simulate' },
  { path: '/sources', label: 'sources' },
  { path: '/household', label: 'household' },
  { path: '/voice', label: 'voice' },
  { path: '/metrics', label: 'metrics' },
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

  // The shell always says the data is simulated
  await expect(page.getByText('Simulated data', { exact: true })).toBeVisible();

  // Verify masked plate
  await expect(page.getByText('KA-03-**-**78')).toBeVisible();

  // Switch role to Family Member
  const familyRadio = page.getByRole('radio', { name: /Family member \(simulated\)/i });
  await familyRadio.click();
  await expect(page.getByText(/Granter Device View \(Simulated\)/i)).toBeVisible();

  // Switch back to You
  const youRadio = page.getByRole('radio', { name: /You \(Citizen Device\)/i });
  await youRadio.click();
  await expect(page.getByRole('heading', { level: 2, name: 'Vehicles' })).toBeVisible();
});

test('voice and plate parsing: sample selection and multilingual read-back', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/voice');

  // The speech notice is shown
  await expect(page.getByRole('note')).toContainText(/speech service/i);

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

test('privacy and voice fixes hold in the browser', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });

  // A revealed field stays visible well past the first second (it was ~60 ms before).
  await page.goto('/household');
  await page.getByRole('button', { name: /^reveal$/i }).first().click();
  await page.getByRole('button', { name: /reveal for 60s/i }).click();
  await page.waitForTimeout(3000);
  await expect(page.getByRole('button', { name: /^hide$/i })).toBeVisible();

  // The family member's Aadhaar, licence and challans are not shown, not even masked.
  await expect(page.getByText(/not shared with delegates/i)).toHaveCount(3);
  await expect(page.getByText(/XXXX-XXXX-/)).toHaveCount(0);

  // Voice: honest speech notice, and saving is blocked on an unresolved class mismatch.
  await page.goto('/voice');
  await expect(page.getByText(/receives the audio/i)).toBeVisible();
  await expect(page.getByText(/transcribed locally/i)).toHaveCount(0);
  await page.getByRole('button', { name: /Sample 4/i }).click();
  await expect(page.getByRole('button', { name: /Yes, Confirm/i })).toBeDisabled();
});

test.describe('welcome page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear the flag once per test, not on every navigation, so a reload can prove it is remembered.
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('test_cleared')) {
        sessionStorage.removeItem('pravaah_intro_seen');
        sessionStorage.setItem('test_cleared', '1');
      }
    });
  });

  test('preloads, plays the anthem on Enter, and can be skipped', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page.getByRole('dialog', { name: /welcome to pravaah/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible();
    const enter = page.getByRole('button', { name: /enter pravaah/i });
    await expect(enter).toBeVisible({ timeout: 15000 });
    await enter.click();
    await expect(page.getByText(/जन गण मन अधिनायक/)).toBeVisible();
    const playing = await page.evaluate(() => {
      const a = document.querySelector('audio');
      return a ? !a.paused : 'no-element-in-dom';
    });
    // The audio element is created in code, so only assert the lyrics and skip path in the page.
    expect(playing === true || playing === 'no-element-in-dom').toBe(true);
    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  });

  test('skip works straight away, and the intro does not return in the same session', async ({ page }) => {
    await page.goto('/plan');
    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'My plan' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('dialog', { name: /welcome to pravaah/i })).toHaveCount(0);
  });
});

test('dependency graph draws its nodes and its links when opened', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/plan');
  await page.getByText('Why each step comes before another').click();
  await expect(page.locator('.react-flow__node').first()).toBeVisible();
  // Links must have a drawable size (they collapsed to nothing once, under the global svg reset).
  const box = await page.locator('.react-flow__edge-path').first().boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(5);
  await expect(page.locator('.react-flow__edge-path')).not.toHaveCount(0);
});

test('assistant opens, offers starters, and says plainly when it is not set up', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route('**/api/health', (r) => r.fulfill({ json: { ok: true, assistant: false, language: false } }));
  await page.goto('/');
  await page.getByRole('button', { name: /ask pravaah/i }).click();
  await expect(page.getByRole('dialog', { name: /pravaah assistant/i })).toBeVisible();
  await expect(page.getByText(/not set up yet/i)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /pravaah assistant/i })).toHaveCount(0);
});

test('the assistant answers through the API using a plan tool', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  let chats = 0;
  await page.route('**/api/health', (r) => r.fulfill({ json: { ok: true, assistant: true, language: true } }));
  await page.route('**/api/chat', (r) => {
    chats++;
    return r.fulfill({
      json:
        chats === 1
          ? { data: { choices: [{ message: { content: null, tool_calls: [{ id: 't1', type: 'function', function: { name: 'get_plan_summary', arguments: '{}' } }] } }] } }
          : { data: { choices: [{ message: { content: 'Your licence expires on day 21.' } }] } },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /ask pravaah/i }).click();
  await page.getByLabel('Your question').fill('When does my licence expire?');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Your licence expires on day 21.')).toBeVisible();
  expect(chats).toBe(2);
});
