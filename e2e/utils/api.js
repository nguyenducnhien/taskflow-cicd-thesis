// API_URL points at the backend directly (not through the frontend), for
// test *setup* only — e.g. creating a throwaway account before a UI test
// exercises it. Defaults match this student's local dev backend (Express on
// :5000); overridable via env var for CI/Docker/AWS the same way
// playwright.config.js's FRONTEND_URL is.
export const API_URL = process.env.E2E_API_URL || 'http://localhost:5000/api';

// Unique per call so repeated/parallel test runs never collide on email
// uniqueness (the backend rejects duplicates with 409 EMAIL_TAKEN).
function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1_000_000)}@e2e.taskflow.local`;
}

// Registers a throwaway Member account straight through the API, bypassing
// the browser. This is arrange/setup data, not a test of the Register page
// itself (Register isn't in CLAUDE.md's AUTOMATED TEST SCOPE). Using the API
// also keeps every test independent of the seeded admin/member1/member2
// accounts the student relies on for their own manual testing.
export async function registerThrowawayUser(request, { name = 'E2E Test User', password = 'Test@1234' } = {}) {
  const email = uniqueEmail('e2e-user');
  const res = await request.post(`${API_URL}/auth/register`, {
    data: { name, email, password },
  });
  if (!res.ok()) {
    throw new Error(`Failed to register throwaway user: ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  return { id: body.data.user.id, name, email, password };
}
