import { test, expect } from '@playwright/test';
import { registerThrowawayUser } from '../utils/api.js';
import { loginAs } from '../utils/auth.js';
import { createProjectAndOpenBoard, createTaskViaUI, taskCard, addLabelViaUI } from '../utils/task.js';

// Covers the "Search/filter" line of CLAUDE.md's AUTOMATED TEST SCOPE:
// search task, filter task. Both drive the same toolbar on the Kanban board
// (TaskBoardPage.jsx) — search is a title substring match server-side
// (task.controller.js listTasks: `t.title LIKE %search%`), filter here uses
// the Label dropdown against one of the three globally seeded labels
// (Bug/Feature/Improvement — labels are Admin-managed, not per-project).
test.describe('Search/filter', () => {
  test('search finds a task by a title substring and excludes non-matching tasks', async ({ page, request }) => {
    const owner = await registerThrowawayUser(request);
    await loginAs(page, owner.email, owner.password);

    const projectName = `E2E Project ${Date.now()}`;
    await createProjectAndOpenBoard(page, projectName);

    const ts = Date.now();
    const matchTitle = `E2E Alpha ${ts}`;
    const otherTitle = `E2E Beta ${ts}`;
    await createTaskViaUI(page, matchTitle);
    await createTaskViaUI(page, otherTitle);

    await page.getByLabel('Search title').fill('Alpha');
    await page.getByRole('button', { name: 'Apply' }).click();

    await expect(taskCard(page, matchTitle)).toBeVisible();
    await expect(taskCard(page, otherTitle)).toHaveCount(0);
  });

  test('filtering by label shows only tasks that carry that label', async ({ page, request }) => {
    const owner = await registerThrowawayUser(request);
    await loginAs(page, owner.email, owner.password);

    const projectName = `E2E Project ${Date.now()}`;
    await createProjectAndOpenBoard(page, projectName);

    const ts = Date.now();
    const labeledTitle = `E2E Labeled ${ts}`;
    const unlabeledTitle = `E2E Unlabeled ${ts}`;
    await createTaskViaUI(page, labeledTitle);
    await createTaskViaUI(page, unlabeledTitle);

    await taskCard(page, labeledTitle).getByRole('link', { name: labeledTitle, exact: true }).click();
    await expect(page.getByRole('heading', { name: labeledTitle })).toBeVisible();
    await addLabelViaUI(page, 'Bug');

    await page.getByRole('link', { name: /Back to/ }).click();
    await expect(page.getByRole('heading', { name: `${projectName} — Board` })).toBeVisible();

    await page.getByLabel('Label').selectOption({ label: 'Bug' });
    await page.getByRole('button', { name: 'Apply' }).click();

    await expect(taskCard(page, labeledTitle)).toBeVisible();
    await expect(taskCard(page, unlabeledTitle)).toHaveCount(0);
  });
});
