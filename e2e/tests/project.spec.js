import { test, expect } from '@playwright/test';
import { registerThrowawayUser } from '../utils/api.js';
import { loginAs } from '../utils/auth.js';
import { createProjectViaUI } from '../utils/project.js';

// Covers the "Project" line of CLAUDE.md's AUTOMATED TEST SCOPE: create,
// update, delete. Each test registers its own throwaway Member account
// (see utils/api.js) and acts as that project's owner — createProject has
// no role restriction, and update/delete are allowed for "Admin OR the
// project's owner" (project.controller.js assertCanManage), so a plain
// Member managing their own project is the realistic, minimal-privilege
// path, not just an Admin superpower.
test.describe('Project', () => {
  test('creates a project and it appears in the project list', async ({ page, request }) => {
    const owner = await registerThrowawayUser(request);
    await loginAs(page, owner.email, owner.password);

    const projectName = `E2E Project ${Date.now()}`;
    await createProjectViaUI(page, projectName);

    const row = page.getByRole('row').filter({ hasText: projectName });
    await expect(row.getByText(owner.name)).toBeVisible();
    await expect(row.getByText('active')).toBeVisible();
  });

  test("updates a project's name and status", async ({ page, request }) => {
    const owner = await registerThrowawayUser(request);
    await loginAs(page, owner.email, owner.password);

    const projectName = `E2E Project ${Date.now()}`;
    await createProjectViaUI(page, projectName);
    await page.getByRole('link', { name: projectName }).click();
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    const updatedName = `${projectName} (Updated)`;
    await page.getByLabel('Name').fill(updatedName);
    await page.getByLabel('Status').selectOption('completed');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('heading', { name: updatedName })).toBeVisible();
    await expect(page.getByText('completed')).toBeVisible();

    // Confirm it persisted, not just local state: re-fetch the list.
    await page.goto('/projects');
    const row = page.getByRole('row').filter({ hasText: updatedName });
    await expect(row.getByText('completed')).toBeVisible();
  });

  test('deletes a project and it disappears from the project list', async ({ page, request }) => {
    const owner = await registerThrowawayUser(request);
    await loginAs(page, owner.email, owner.password);

    const projectName = `E2E Project ${Date.now()}`;
    await createProjectViaUI(page, projectName);
    await page.getByRole('link', { name: projectName }).click();
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(page).toHaveURL('/projects');
    await expect(page.getByRole('row').filter({ hasText: projectName })).toHaveCount(0);

    // Confirm it's really gone server-side, not just removed from local
    // state: a fresh load of the list must not bring it back.
    await page.reload();
    await expect(page.getByRole('row').filter({ hasText: projectName })).toHaveCount(0);
  });
});
