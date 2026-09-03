import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as projectApi from '../api/project.api';
import { toDateInputValue } from '../api/project.api';

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState(null);
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const [newMemberId, setNewMemberId] = useState('');
  const [memberError, setMemberError] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    Promise.all([projectApi.getProject(id), projectApi.listMembers(id)])
      .then(([proj, mem]) => {
        setProject(proj);
        setMembers(mem);
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message || 'Could not load project'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="page">Loading project...</p>;
  if (loadError) return <p className="page form-error">{loadError}</p>;

  // Mirrors backend project.controller.js assertCanManage(): Admin, or the
  // project's owner, may edit/delete the project and manage its members.
  const canManage = user.role === 'Admin' || project.owner_id === user.id;

  function startEdit() {
    setEditFields({
      name: project.name,
      description: project.description || '',
      start_date: toDateInputValue(project.start_date),
      end_date: toDateInputValue(project.end_date),
      status: project.status,
    });
    setEditError('');
    setEditing(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setEditError('');
    setSaving(true);
    try {
      const updated = await projectApi.updateProject(id, {
        name: editFields.name,
        description: editFields.description || null,
        start_date: editFields.start_date || null,
        end_date: editFields.end_date || null,
        status: editFields.status,
      });
      setProject(updated);
      setEditing(false);
    } catch (err) {
      setEditError(err.response?.data?.error?.message || 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete project "${project.name}"? This also deletes all its tasks.`)) {
      return;
    }
    await projectApi.deleteProject(id);
    navigate('/projects', { replace: true });
  }

  async function handleAddMember(e) {
    e.preventDefault();
    setMemberError('');
    const userId = Number(newMemberId);
    if (!Number.isInteger(userId) || userId < 1) {
      setMemberError('Enter a valid numeric user ID');
      return;
    }
    setAddingMember(true);
    try {
      await projectApi.addMember(id, userId);
      const refreshed = await projectApi.listMembers(id);
      setMembers(refreshed);
      setNewMemberId('');
    } catch (err) {
      setMemberError(err.response?.data?.error?.message || 'Could not add member');
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(userId) {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await projectApi.removeMember(id, userId);
      setMembers((prev) => prev.filter((m) => m.id !== userId));
    } catch (err) {
      setMemberError(err.response?.data?.error?.message || 'Could not remove member');
    }
  }

  return (
    <div className="page">
      {editing ? (
        <form className="inline-form" onSubmit={handleSave}>
          <h1>Edit Project</h1>
          {editError && <div className="form-error">{editError}</div>}

          <label htmlFor="edit-name">Name</label>
          <input
            id="edit-name"
            value={editFields.name}
            onChange={(e) => setEditFields({ ...editFields, name: e.target.value })}
            required
            minLength={2}
            maxLength={150}
          />

          <label htmlFor="edit-description">Description</label>
          <input
            id="edit-description"
            value={editFields.description}
            onChange={(e) => setEditFields({ ...editFields, description: e.target.value })}
          />

          <div className="form-row">
            <div>
              <label htmlFor="edit-start">Start date</label>
              <input
                id="edit-start"
                type="date"
                value={editFields.start_date}
                onChange={(e) => setEditFields({ ...editFields, start_date: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="edit-end">End date</label>
              <input
                id="edit-end"
                type="date"
                value={editFields.end_date}
                onChange={(e) => setEditFields({ ...editFields, end_date: e.target.value })}
              />
            </div>
          </div>

          <label htmlFor="edit-status">Status</label>
          <select
            id="edit-status"
            value={editFields.status}
            onChange={(e) => setEditFields({ ...editFields, status: e.target.value })}
          >
            <option value="active">active</option>
            <option value="completed">completed</option>
            <option value="archived">archived</option>
          </select>

          <div className="form-row">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="page-header">
          <div>
            <h1>{project.name}</h1>
            <p className="auth-subtitle">
              Owner: {project.owner_name} · <span className={`badge badge-${project.status}`}>{project.status}</span>
            </p>
          </div>
          {canManage && (
            <div className="form-row">
              <button onClick={startEdit}>Edit</button>
              <button className="btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {!editing && (
        <>
          <p>{project.description || 'No description.'}</p>
          <p>
            <strong>Start:</strong> {toDateInputValue(project.start_date) || '—'} &nbsp; <strong>End:</strong>{' '}
            {toDateInputValue(project.end_date) || '—'}
          </p>
        </>
      )}

      <h2>Members</h2>
      {memberError && <div className="form-error">{memberError}</div>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            {canManage && <th></th>}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>{m.email}</td>
              {canManage && (
                <td>
                  {m.id !== project.owner_id && (
                    <button className="btn-danger btn-small" onClick={() => handleRemoveMember(m.id)}>
                      Remove
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {canManage && (
        <form className="inline-form form-row" onSubmit={handleAddMember}>
          <div>
            <label htmlFor="new-member">Add member by User ID</label>
            <input
              id="new-member"
              type="number"
              min="1"
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
              placeholder="e.g. 2"
            />
          </div>
          <button type="submit" disabled={addingMember}>
            {addingMember ? 'Adding...' : 'Add'}
          </button>
        </form>
      )}
    </div>
  );
}
