import { test, expect } from '@playwright/test';
import { registerThrowawayUser } from '../utils/api.js';
import { loginAs } from '../utils/auth.js';
import { createProjectAndOpenBoard, createTaskViaUI, taskCard, boardColumn } from '../utils/task.js';

// Covers the "Task" line of CLAUDE.md's AUTOMATED TEST SCOPE: create,
// update, change status, delete. Each test registers its own throwaway
// Member and creates its own project, then acts as that task's reporter —
// task.controller.js's assertCanEdit/assertCanDelete both allow "the
// reporter" regardless of role or assignee, so this is the realistic,
// minimal-privilege path (same reasoning as project.spec.js).
test.describe('Task', () => {
  test('creates a task and it lands in the To Do column', async ({ page, request }) => {
    const owner = await registerThrowawayUser(request);
    await loginAs(page, owner.email, owner.password);

    const projectName = `E2E Project ${Date.now()}`;
    await createProjectAndOpenBoard(page, projectName);

    const taskTitle = `E2E Task ${Date.now()}`;
    await createTaskViaUI(page, taskTitle, { priority: 'high' });

    const column = boardColumn(page, 'To Do');
    const card = taskCard(page, taskTitle);
    await expect(column.locator('.task-card').filter({ has: page.getByRole('link', { name: taskTitle, exact: true }) })).toBeVisible();
    await expect(card.getByText('high')).toBeVisible();
  });

  test("updates a task's title and priority", async ({ page, request }) => {
    const owner = await registerThrowawayUser(request);
    await loginAs(page, owner.email, owner.password);

    const projectName = `E2E Project ${Date.now()}`;
    await createProjectAndOpenBoard(page, projectName);

    const taskTitle = `E2E Task ${Date.now()}`;
    await createTaskViaUI(page, taskTitle, { priority: 'low' });
    await taskCard(page, taskTitle).getByRole('link', { name: taskTitle, exact: true }).click();

    await expect(page.getByRole('heading', { name: taskTitle })).toBeVisible();
    await page.getByRole('button', { name: 'Edit' }).click();

    const updatedTitle = `${taskTitle} (Updated)`;
    await page.getByLabel('Title').fill(updatedTitle);
    await page.getByLabel('Priority').selectOption('high');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible();
    await expect(page.getByText('high')).toBeVisible();

    // Confirm it persisted server-side, not just local state.
    await page.reload();
    await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible();
    await expect(page.getByText('high')).toBeVisible();
  });

  test('changes a task status and it moves to the matching board column', async ({ page, request }) => {
    const owner = await registerThrowawayUser(request);
    await loginAs(page, owner.email, owner.password);

    const projectName = `E2E Project ${Date.now()}`;
    await createProjectAndOpenBoard(page, projectName);

    const taskTitle = `E2E Task ${Date.now()}`;
    await createTaskViaUI(page, taskTitle);

    const card = taskCard(page, taskTitle);
    await card.locator('select').selectOption('In Progress');

    const targetColumn = boardColumn(page, 'In Progress');
    await expect(targetColumn.getByRole('link', { name: taskTitle, exact: true })).toBeVisible();

    // Confirm the new status persisted server-side: reload re-fetches the
    // task list from the API and re-groups it into columns from scratch.
    await page.reload();
    await expect(boardColumn(page, 'In Progress').getByRole('link', { name: taskTitle, exact: true })).toBeVisible();
    await expect(boardColumn(page, 'To Do').getByRole('link', { name: taskTitle, exact: true })).toHaveCount(0);
  });

  test('deletes a task and it disappears from the board', async ({ page, request }) => {
    const owner = await registerThrowawayUser(request);
    await loginAs(page, owner.email, owner.password);

    const projectName = `E2E Project ${Date.now()}`;
    await createProjectAndOpenBoard(page, projectName);

    const taskTitle = `E2E Task ${Date.now()}`;
    await createTaskViaUI(page, taskTitle);

    page.once('dialog', (dialog) => dialog.accept());
    await taskCard(page, taskTitle).getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByRole('link', { name: taskTitle, exact: true })).toHaveCount(0);

    // Confirm it's really gone server-side, not just removed from local state.
    await page.reload();
    await expect(page.getByRole('link', { name: taskTitle, exact: true })).toHaveCount(0);
  });
});
