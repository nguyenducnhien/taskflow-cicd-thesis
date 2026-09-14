import { expect } from '@playwright/test';
import { createProjectViaUI } from './project.js';

// Creates a project via UI and navigates straight to its Kanban board.
export async function createProjectAndOpenBoard(page, projectName) {
  await createProjectViaUI(page, projectName);
  await page.getByRole('link', { name: projectName }).click();
  await page.getByRole('button', { name: 'Board' }).click();
  await expect(page.getByRole('heading', { name: `${projectName} — Board` })).toBeVisible();
}

// Fills and submits the "New Task" form. Scoped to the form containing the
// "Create Task" button because the filter toolbar next to it also has an
// "Assignee" field with the same label — without scoping, getByLabel would
// be ambiguous the moment both forms are open together.
export async function createTaskViaUI(page, title, { description = 'Created by Playwright', priority } = {}) {
  await page.getByRole('button', { name: 'New Task' }).click();
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Create Task' }) });
  await form.getByLabel('Title').fill(title);
  await form.getByLabel('Description').fill(description);
  if (priority) await form.getByLabel('Priority').selectOption(priority);
  await form.getByRole('button', { name: 'Create Task' }).click();

  const card = taskCard(page, title);
  await expect(card).toBeVisible();
  return card;
}

// Task cards on the board are plain divs (`.task-card`), not table rows, so
// this scopes by the card that contains a link with this exact title —
// robust even when two task titles share a common substring.
export function taskCard(page, title) {
  return page.locator('.task-card').filter({ has: page.getByRole('link', { name: title, exact: true }) });
}

// The board groups cards into `.board-column` divs headed by "<status> <count>".
export function boardColumn(page, status) {
  return page.locator('.board-column').filter({ has: page.getByRole('heading', { name: new RegExp(`^${status}`) }) });
}
