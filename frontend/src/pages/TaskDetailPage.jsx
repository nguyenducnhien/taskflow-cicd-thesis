import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as projectApi from '../api/project.api';
import { toDateInputValue } from '../api/project.api';
import * as taskApi from '../api/task.api';
import * as labelApi from '../api/label.api';

const STATUSES = ['To Do', 'In Progress', 'Review', 'Done'];

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [members, setMembers] = useState([]);
  const [allLabels, setAllLabels] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState(null);
  const [saving, setSaving] = useState(false);

  const [labelToAdd, setLabelToAdd] = useState('');
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    taskApi
      .getTask(id)
      .then((t) => {
        setTask(t);
        return Promise.all([projectApi.listMembers(t.project_id), labelApi.listLabels(), taskApi.listComments(id)]);
      })
      .then(([mem, lbl, com]) => {
        setMembers(mem);
        setAllLabels(lbl);
        setComments(com);
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message || 'Could not load task'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="page">Loading task...</p>;
  if (loadError) return <p className="page form-error">{loadError}</p>;

  const canEdit = user.role === 'Admin' || task.reporter_id === user.id || task.assignee_id === user.id;
  const canDelete = user.role === 'Admin' || task.reporter_id === user.id;
  const availableLabels = allLabels.filter((l) => !task.labels.some((tl) => tl.id === l.id));

  function startEdit() {
    setEditFields({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      assignee_id: task.assignee_id || '',
      due_date: toDateInputValue(task.due_date),
    });
    setActionError('');
    setEditing(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setActionError('');
    setSaving(true);
    try {
      const updated = await taskApi.updateTask(id, {
        title: editFields.title,
        description: editFields.description || null,
        priority: editFields.priority,
        assignee_id: editFields.assignee_id || null,
        due_date: editFields.due_date || null,
      });
      setTask({ ...updated, labels: task.labels });
      setEditing(false);
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus) {
    const previous = task.status;
    setTask({ ...task, status: newStatus });
    try {
      await taskApi.updateTaskStatus(id, newStatus);
    } catch (err) {
      setTask({ ...task, status: previous });
      setActionError(err.response?.data?.error?.message || 'Could not change status');
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    await taskApi.deleteTask(id);
    navigate(`/projects/${task.project_id}/board`, { replace: true });
  }

  async function handleAddLabel(e) {
    e.preventDefault();
    if (!labelToAdd) return;
    try {
      const labels = await taskApi.addLabel(id, Number(labelToAdd));
      setTask({ ...task, labels });
      setLabelToAdd('');
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Could not add label');
    }
  }

  async function handleRemoveLabel(labelId) {
    try {
      const labels = await taskApi.removeLabel(id, labelId);
      setTask({ ...task, labels });
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Could not remove label');
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const comment = await taskApi.createComment(id, newComment.trim());
      setComments((prev) => [...prev, comment]);
      setNewComment('');
    } catch (err) {
      setActionError(err.response?.data?.error?.message || 'Could not post comment');
    } finally {
      setPostingComment(false);
    }
  }

  return (
    <div className="page">
      <p>
        <Link to={`/projects/${task.project_id}/board`}>← Back to {task.project_name} board</Link>
      </p>

      {actionError && <div className="form-error">{actionError}</div>}

      {editing ? (
        <form className="inline-form" onSubmit={handleSave}>
          <h1>Edit Task</h1>

          <label htmlFor="title">Title</label>
          <input
            id="title"
            value={editFields.title}
            onChange={(e) => setEditFields({ ...editFields, title: e.target.value })}
            required
            minLength={2}
            maxLength={200}
          />

          <label htmlFor="description">Description</label>
          <input
            id="description"
            value={editFields.description}
            onChange={(e) => setEditFields({ ...editFields, description: e.target.value })}
          />

          <div className="form-row">
            <div>
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                value={editFields.priority}
                onChange={(e) => setEditFields({ ...editFields, priority: e.target.value })}
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>
            <div>
              <label htmlFor="assignee">Assignee</label>
              <select
                id="assignee"
                value={editFields.assignee_id}
                onChange={(e) => setEditFields({ ...editFields, assignee_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="due_date">Due date</label>
              <input
                id="due_date"
                type="date"
                value={editFields.due_date}
                onChange={(e) => setEditFields({ ...editFields, due_date: e.target.value })}
              />
            </div>
          </div>

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
            <h1>{task.title}</h1>
            <p className="auth-subtitle">
              {task.project_name} · Reporter: {task.reporter_name} · Assignee: {task.assignee_name || 'Unassigned'}
            </p>
          </div>
          <div className="form-row">
            {canEdit && <button onClick={startEdit}>Edit</button>}
            {canDelete && (
              <button className="btn-danger" onClick={handleDelete}>
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {!editing && (
        <>
          <p>{task.description || 'No description.'}</p>
          <p>
            <strong>Priority:</strong> <span className={`badge badge-priority-${task.priority}`}>{task.priority}</span>
            &nbsp; <strong>Due:</strong> {toDateInputValue(task.due_date) || '—'}
          </p>
        </>
      )}

      <p>
        <strong>Status:</strong>{' '}
        {canEdit ? (
          <select value={task.status} onChange={(e) => handleStatusChange(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <span className="badge badge-active">{task.status}</span>
        )}
      </p>

      <h2>Labels</h2>
      <div className="label-chips">
        {task.labels.length === 0 && <span>No labels.</span>}
        {task.labels.map((l) => (
          <span key={l.id} className="chip" style={{ backgroundColor: l.color }}>
            {l.name}
            {canEdit && (
              <button type="button" className="chip-remove" onClick={() => handleRemoveLabel(l.id)}>
                x
              </button>
            )}
          </span>
        ))}
      </div>
      {canEdit && availableLabels.length > 0 && (
        <form className="form-row" onSubmit={handleAddLabel}>
          <select value={labelToAdd} onChange={(e) => setLabelToAdd(e.target.value)}>
            <option value="">Add a label...</option>
            {availableLabels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={!labelToAdd}>
            Add
          </button>
        </form>
      )}

      <h2>Comments</h2>
      {comments.length === 0 && <p>No comments yet.</p>}
      {comments.map((c) => (
        <div key={c.id} className="comment">
          <strong>{c.author_name}</strong>{' '}
          <span className="task-card-meta">{new Date(c.created_at).toLocaleString()}</span>
          <p>{c.content}</p>
        </div>
      ))}
      <form className="inline-form" onSubmit={handleAddComment}>
        <label htmlFor="comment">Add a comment</label>
        <input id="comment" value={newComment} onChange={(e) => setNewComment(e.target.value)} maxLength={2000} />
        <button type="submit" disabled={postingComment || !newComment.trim()}>
          {postingComment ? 'Posting...' : 'Post Comment'}
        </button>
      </form>
    </div>
  );
}
