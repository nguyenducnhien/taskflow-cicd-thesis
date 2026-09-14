import { expect } from '@playwright/test';

// Fills and submits the "New Project" form on /projects. Assumes the caller
// is already logged in. Waits for the new row so callers can immediately
// click through to it (e.g. `page.getByRole('link', { name })`).
export async function createProjectViaUI(page, name, { description = 'Created by Playwright' } = {}) {
  await page.goto('/projects');
  await page.getByRole('button', { name: 'New Project' }).click();
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Description').fill(description);
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('row').filter({ hasText: name })).toBeVisible();
}
