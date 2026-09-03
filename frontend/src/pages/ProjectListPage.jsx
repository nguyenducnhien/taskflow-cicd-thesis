import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as projectApi from '../api/project.api';
import { toDateInputValue } from '../api/project.api';

export default function ProjectListPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    projectApi
      .listProjects()
      .then(setProjects)
      .catch((err) => setLoadError(err.response?.data?.error?.message || 'Could not load projects'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const project = await projectApi.createProject({
        name,
        description: description || null,
        start_date: startDate || null,
        end_date: endDate || null,
      });
      setProjects((prev) => [project, ...prev]);
      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setShowForm(false);
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Could not create project');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="page">Loading projects...</p>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Projects</h1>
        <button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancel' : 'New Project'}</button>
      </div>

      {loadError && <div className="form-error">{loadError}</div>}

      {showForm && (
        <form className="inline-form" onSubmit={handleCreate}>
          {formError && <div className="form-error">{formError}</div>}

          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={150} />

          <label htmlFor="description">Description</label>
          <input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />

          <div className="form-row">
            <div>
              <label htmlFor="start_date">Start date</label>
              <input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="end_date">End date</label>
              <input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      )}

      {projects.length === 0 ? (
        <p>No projects yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Start</th>
              <th>End</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link to={`/projects/${p.id}`}>{p.name}</Link>
                </td>
                <td>{p.owner_name}</td>
                <td>
                  <span className={`badge badge-${p.status}`}>{p.status}</span>
                </td>
                <td>{toDateInputValue(p.start_date) || '—'}</td>
                <td>{toDateInputValue(p.end_date) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
