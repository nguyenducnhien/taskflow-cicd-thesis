import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as adminApi from '../api/admin.api';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  const [resetTargetId, setResetTargetId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    adminApi
      .listUsers()
      .then(setUsers)
      .catch((err) => setLoadError(err.response?.data?.error?.message || 'Could not load users'))
      .finally(() => setLoading(false));
  }, []);

  function replaceUser(updated) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  async function handleToggleStatus(target) {
    setActionError('');
    const nextStatus = target.status === 'active' ? 'locked' : 'active';
    try {
      const updated = await adminApi.updateUserStatus(target.id, nextStatus);
      replaceUser(updated);
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Could not change account status');
    }
  }

  async function handleRoleChange(target, role) {
    setActionError('');
    try {
      const updated = await adminApi.updateUserRole(target.id, role);
      replaceUser(updated);
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Could not change role');
    }
  }

  function openResetForm(userId) {
    setActionError('');
    setResetMessage('');
    setNewPassword('');
    setResetTargetId(userId);
  }

  async function handleResetPassword(e, userId) {
    e.preventDefault();
    setActionError('');
    setResetSubmitting(true);
    try {
      await adminApi.resetUserPassword(userId, newPassword);
      setResetMessage('Password reset successfully.');
      setResetTargetId(null);
      setNewPassword('');
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Could not reset password');
    } finally {
      setResetSubmitting(false);
    }
  }

  if (loading) return <p className="page">Loading users...</p>;
  if (loadError) return <p className="page form-error">{loadError}</p>;

  return (
    <div className="page page-wide">
      <h1>Manage Users</h1>
      <p className="auth-subtitle">Lock/unlock accounts, assign roles, and reset passwords.</p>

      {actionError && <div className="form-error">{actionError}</div>}
      {resetMessage && <p>{resetMessage}</p>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u.id === currentUser.id;
            return (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    disabled={isSelf}
                    onChange={(e) => handleRoleChange(u, e.target.value)}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Member">Member</option>
                  </select>
                </td>
                <td>
                  <span className={`badge ${u.status === 'active' ? 'badge-active' : 'badge-locked'}`}>
                    {u.status}
                  </span>
                </td>
                <td>
                  <div className="form-row">
                    <button className="btn-small" disabled={isSelf} onClick={() => handleToggleStatus(u)}>
                      {u.status === 'active' ? 'Lock' : 'Unlock'}
                    </button>
                    <button className="btn-small" onClick={() => openResetForm(u.id)}>
                      Reset password
                    </button>
                  </div>
                  {resetTargetId === u.id && (
                    <form className="form-row" onSubmit={(e) => handleResetPassword(e, u.id)}>
                      <input
                        type="password"
                        placeholder="New password (min 8 chars)"
                        minLength={8}
                        required
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button type="submit" className="btn-small" disabled={resetSubmitting}>
                        {resetSubmitting ? 'Saving...' : 'Save'}
                      </button>
                      <button type="button" className="btn-small" onClick={() => setResetTargetId(null)}>
                        Cancel
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
