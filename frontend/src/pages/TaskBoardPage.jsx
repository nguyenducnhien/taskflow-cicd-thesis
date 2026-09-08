import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as projectApi from '../api/project.api';
import { toDateInputValue } from '../api/project.api';
import * as taskApi from '../api/task.api';
import * as labelApi from '../api/label.api';

const STATUSES = ['To Do', 'In Progress', 'Review', 'Done'];
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function TaskBoardPage() {
  const { id: projectId } = useParams();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [labels, setLabels] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [labelFilter, setLabelFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function loadTasks(filters) {
    return taskApi.listTasks(projectId, filters).then(setTasks);
  }

  useEffect(() => {
    Promise.all([projectApi.getProject(projectId), projectApi.listMembers(projectId), labelApi.listLabels(), loadTasks({})])
      .then(([proj, mem, lbl]) => {
        setProject(proj);
        setMembers(mem);
        setLabels(lbl);
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message || 'Could not load the board'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function applyFilters(e) {
    e.preventDefault();
    loadTasks({
      search: search || undefined,
      assignee_id: assigneeFilter || undefined,
      label_id: labelFilter || undefined,
    }).catch((err) => setLoadError(err.response?.data?.error?.message || 'Could not filter tasks'));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const task = await taskApi.createTask(projectId, {
        title,
        description: description || null,
        priority,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
      });
      setTasks((prev) => [task, ...prev]);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setAssigneeId('');
      setDueDate('');
      setShowForm(false);
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Could not create task');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(task, newStatus) {
    const previous = task.status;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    try {
      await taskApi.updateTaskStatus(task.id, newStatus);
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: previous } : t)));
      setLoadError(err.response?.data?.error?.message || 'Could not change status');
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await taskApi.deleteTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      setLoadError(err.response?.data?.error?.message || 'Could not delete task');
    }
  }

  const columns = useMemo(() => {
    const grouped = Object.fromEntries(STATUSES.map((s) => [s, []]));
    for (const task of tasks) {
      (grouped[task.status] || (grouped[task.status] = [])).push(task);
    }
    return grouped;
  }, [tasks]);

  if (loading) return <p className="page">Loading board...</p>;
  if (loadError && !project) return <p className="page form-error">{loadError}</p>;

  function canEdit(task) {
    return user.role === 'Admin' || task.reporter_id === user.id || task.assignee_id === user.id;
  }
  function canDelete(task) {
    return user.role === 'Admin' || task.reporter_id === user.id;
  }

  return (
    <div className="page page-wide">
      <div className="page-header">
        <div>
          <h1>{project.name} — Board</h1>
          <p className="auth-subtitle">
            <Link to={`/projects/${projectId}`}>Back to project</Link>
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'New Task'}</button>
      </div>

      {loadError && <div className="form-error">{loadError}</div>}

      {showForm && (
        <form className="inline-form" onSubmit={handleCreate}>
          {formError && <div className="form-error">{formError}</div>}

          <label htmlFor="title">Title</label>
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} maxLength={200} />

          <label htmlFor="description">Description</label>
          <input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />

          <div className="form-row">
            <div>
              <label htmlFor="priority">Priority</label>
              <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>
            <div>
              <label htmlFor="assignee">Assignee</label>
              <select id="assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
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
              <input id="due_date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      )}

      <form className="inline-form form-row" onSubmit={applyFilters}>
        <div>
          <label htmlFor="search">Search title</label>
          <input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. login" />
        </div>
        <div>
          <label htmlFor="filter-assignee">Assignee</label>
          <select id="filter-assignee" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="">Any</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-label">Label</label>
          <select id="filter-label" value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)}>
            <option value="">Any</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">Apply</button>
      </form>

      <div className="board">
        {STATUSES.map((status) => (
          <div className="board-column" key={status}>
            <h2>
              {status} <span className="board-count">{columns[status].length}</span>
            </h2>
            {columns[status].map((task) => {
              const due = toDateInputValue(task.due_date);
              const overdue = due && due < todayStr() && task.status !== 'Done';
              return (
                <div className="task-card" key={task.id}>
                  <div className="task-card-title">
                    <Link to={`/tasks/${task.id}`}>{task.title}</Link>
                    <span className={`badge badge-priority-${task.priority}`}>{task.priority}</span>
                  </div>
                  <p className="task-card-meta">{task.assignee_name || 'Unassigned'}</p>
                  {due && <p className={overdue ? 'task-card-overdue' : 'task-card-meta'}>Due {due}</p>}

                  {canEdit(task) && (
                    <select value={task.status} onChange={(e) => handleStatusChange(task, e.target.value)}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  )}
                  {canDelete(task) && (
                    <button className="btn-danger btn-small" onClick={() => handleDelete(task)}>
                      Delete
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
