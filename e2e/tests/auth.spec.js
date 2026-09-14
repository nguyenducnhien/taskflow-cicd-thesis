import { test, expect } from '@playwright/test';
import { registerThrowawayUser } from '../utils/api.js';
import { loginAs, ADMIN } from '../utils/auth.js';

// Covers the "Authentication" line of CLAUDE.md's AUTOMATED TEST SCOPE:
// login, logout, reset password. Reset password is admin-assisted only (no
// self-service email flow), so that scenario drives the Admin Users page
// built for exactly this purpose.
test.describe('Authentication', () => {
  test('logs in with valid credentials and reaches the dashboard', async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);

    await expect(page).toHaveURL('/');
    await expect(page.getByText('Welcome, System Admin (Admin)')).toBeVisible();
  });

  test('shows an error and stays on /login with wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN.email);
    await page.getByLabel('Password').fill('WrongPassword1');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Email or password is incorrect')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('logs out and clears the session', async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/login');

    // The session must be truly cleared (token removed), not just the
    // current page navigated — re-requesting a protected route should
    // bounce back to /login as well.
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('admin resets a user password and the user logs in with the new password', async ({ page, request }) => {
    const user = await registerThrowawayUser(request);
    const newPassword = 'NewPass@5678';

    await test.step('admin logs in', async () => {
      await loginAs(page, ADMIN.email, ADMIN.password);
    });

    await test.step('admin resets the target user password from the Admin Users page', async () => {
      await page.getByRole('link', { name: 'Admin', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Manage Users' })).toBeVisible();

      const row = page.getByRole('row').filter({ hasText: user.email });
      await row.getByRole('button', { name: 'Reset password' }).click();
      await row.getByPlaceholder('New password (min 8 chars)').fill(newPassword);
      await row.getByRole('button', { name: 'Save' }).click();

      await expect(page.getByText('Password reset successfully.')).toBeVisible();
    });

    await test.step('admin logs out', async () => {
      await page.getByRole('button', { name: 'Log out' }).click();
      await expect(page).toHaveURL('/login');
    });

    await test.step('the old password no longer works', async () => {
      await page.getByLabel('Email').fill(user.email);
      await page.getByLabel('Password').fill(user.password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByText('Email or password is incorrect')).toBeVisible();
    });

    await test.step('the user logs in with the new password', async () => {
      await loginAs(page, user.email, newPassword);
      await expect(page.getByText(`Welcome, ${user.name}`)).toBeVisible();
    });
  });
});
