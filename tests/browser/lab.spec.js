import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('solves, inspects history, and plays a legal solution', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByLabel('Playback speed').selectOption('0');
  await page.getByRole('button', { name: 'Run search', exact: true }).click();
  await expect(page.locator('#result-title')).toHaveText('Solution found');
  await expect(page.locator('#solution-path .path-step')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Download run JSON' })).toBeEnabled();
  await page.getByRole('button', { name: 'Previous search step' }).click();
  await expect(page.locator('#event-kind')).not.toHaveText('Goal reached');
  await page.getByRole('button', { name: 'Play solution' }).click();
  await expect(page.locator('#solution-position')).toHaveText('Move 2 of 2');
  expect(errors).toEqual([]);
});
test('validates duplicate tiles and unreachable states, and handles a zero-depth cutoff', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Initial state').fill('112345678');
  await page.getByRole('button', { name: 'Run search', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('exactly once');
  await page.getByLabel('Initial state').fill('213456780');
  await page.getByRole('button', { name: 'Run search', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('cannot reach');
  await page.getByLabel('Initial state').fill('123456708');
  await page.getByLabel('Depth limit', { exact: true }).fill('0');
  await page.getByLabel('Playback speed').selectOption('0');
  await page.getByRole('button', { name: 'Run search', exact: true }).click();
  await expect(page.locator('#result-title')).toHaveText('Depth limit reached');
});
test('pauses, steps, resumes, and reset cancels pending playback', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Run search', exact: true }).click();
  await page.getByRole('button', { name: 'Pause search' }).click();
  await expect(page.locator('#run-state')).toHaveText('Paused');
  await page.getByRole('button', { name: 'Next search step' }).click();
  await page.getByRole('button', { name: 'Resume search' }).click();
  await page.getByRole('button', { name: 'Reset search' }).click();
  await expect(page.locator('#run-state')).toHaveText('Ready');
  await page.waitForTimeout(700);
  await expect(page.locator('#run-state')).toHaveText('Ready');
});
test('compares independent DLS limits on a fixed input and clears stale rows', async ({ page }) => {
  await page.goto('/#compare');
  await page.getByLabel('Comparison depth limits').fill('0, 2, 4');
  await page.getByRole('button', { name: 'Run comparison' }).click();
  await expect(page.locator('#comparison-body tr')).toHaveCount(3);
  await expect(page.locator('#comparison-body')).toContainText('Solved');
  await page.getByRole('link', { name: 'Visualizer', exact: true }).click();
  await page.getByLabel('Initial state').fill('123456708');
  await page.getByRole('link', { name: 'Compare limits', exact: true }).click();
  await expect(page.locator('#comparison-body')).not.toContainText('Solved');
});
test('supports custom goals and responsive layouts with no automated accessibility violations', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Goal state').fill('213456780');
  await page.getByRole('button', { name: 'Generate random puzzle' }).click();
  await expect(page.getByRole('alert')).toBeHidden();
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const route of ['lab', 'compare', 'algorithm', 'about']) {
    await page.goto(`/#${route}`);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
  }
});
