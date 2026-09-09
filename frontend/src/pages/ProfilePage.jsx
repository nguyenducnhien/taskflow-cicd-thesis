import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as authApi from '../api/auth.api';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      // avatar is optional and nullable on the backend (see
      // auth.validation.js updateProfileRules): an empty field clears it.
      const updated = await authApi.updateProfile({ name, avatar: avatar.trim() || null });
      updateUser(updated);
      setMessage('Profile updated.');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <h1>My Profile</h1>

      <form className="inline-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        {message && <p>{message}</p>}

        <label htmlFor="email">Email</label>
        <input id="email" value={user.email} disabled />

        <label htmlFor="role">Role</label>
        <input id="role" value={user.role} disabled />

        <label htmlFor="name">Name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={100}
        />

        <label htmlFor="avatar">Avatar URL</label>
        <input
          id="avatar"
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
          placeholder="https://..."
        />

        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
