import axiosClient from './axiosClient';

// See backend/src/modules/admin/admin.routes.js + admin.controller.js.
// Every route here requires the caller to be Admin (enforced server-side by
// requireRole('Admin')); the frontend only hides the UI for non-admins via
// ProtectedRoute roles={['Admin']} on the /admin/users route.

export async function listUsers() {
  const res = await axiosClient.get('/admin/users');
  return res.data.data.users;
}

export async function updateUserStatus(id, status) {
  const res = await axiosClient.patch(`/admin/users/${id}/status`, { status });
  return res.data.data.user;
}

export async function updateUserRole(id, role) {
  const res = await axiosClient.patch(`/admin/users/${id}/role`, { role });
  return res.data.data.user;
}

export async function resetUserPassword(id, newPassword) {
  await axiosClient.patch(`/admin/users/${id}/password`, { new_password: newPassword });
}
