import { expect } from '@playwright/test';

// Seeded admin account (database/seed.sql). Safe to reuse read-only across
// specs (logging in doesn't mutate it) — unlike member1/member2, nothing in
// this suite changes the admin account's own data.
export const ADMIN = { email: 'admin@taskflow.local', password: 'Test@1234' };

// Drives the real /login form and waits for the post-login redirect, so
// every spec exercises the same login path a user would instead of
// shortcutting via localStorage/token injection.
export async function loginAs(page, email, password) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}
