import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('sample runs through the pipeline, renders action cards and has no axe violations', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try a sample' }).click();

  await expect(page.getByRole('heading', { name: 'What to do now' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Call 112 now' })).toBeVisible();
  await expect(page.locator('.card').first()).toBeVisible();
  await expect(page.getByText('Checked against built-in guidance')).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
