import { test, expect } from '@playwright/test';

/**
 * Visual Regression Test — Card Canvas Rendering
 *
 * The splash page renders a live animated demo card (for @octocat) using the
 * same drawCardFrame/buildSpriteGrid pipeline used throughout the app.  If a
 * future change breaks canvas path isolation (beginPath), palette contrast,
 * sprite symmetry, or layout coordinates, these screenshots will catch it.
 *
 * Baselining
 * ──────────
 * First run:  npx playwright test --update-snapshots
 * Subsequent: npx playwright test
 * Failure:    diff images appear in test-results/
 */

const CARD_W = 460;
const CARD_H = 220;

test.describe('Card Canvas Visual Regression', () => {

  test('splash demo card renders with correct layout', async ({ page }) => {
    await page.goto('/');

    // Locate the 460×220 demo card canvas on the splash screen
    const canvas = page.locator('canvas[width="460"][height="220"]');
    await canvas.waitFor({ state: 'visible', timeout: 15000 });

    // Wait until the canvas has actual non-transparent pixel content
    // (the animation loop starts after a 50ms setTimeout)
    await page.waitForFunction(
      () => {
        const c = document.querySelector('canvas[width="460"][height="220"]') as HTMLCanvasElement | null;
        if (!c) return false;
        const ctx = c.getContext('2d');
        if (!ctx) return false;
        try {
          const d = ctx.getImageData(0, 0, 460, 220).data;
          let count = 0;
          for (let i = 3; i < d.length; i += 4) {
            if (d[i] > 0 && ++count >= 100) return true;
          }
          return false;
        } catch {
          return false;
        }
      },
      { timeout: 15000 }
    );

    // Assert canvas has the correct intrinsic dimensions
    const dims = await canvas.evaluate((el: HTMLCanvasElement) => ({
      width: el.width,
      height: el.height,
    }));
    expect(dims.width).toBe(CARD_W);
    expect(dims.height).toBe(CARD_H);

    // Full-element screenshot against baseline
    await expect(canvas).toHaveScreenshot('splash-demo-card.png');
  });

  test('no console errors during card render', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    const canvas = page.locator('canvas[width="460"][height="220"]');
    await canvas.waitFor({ state: 'visible', timeout: 15000 });

    // Give the animation a moment to run
    await page.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
  });
});
