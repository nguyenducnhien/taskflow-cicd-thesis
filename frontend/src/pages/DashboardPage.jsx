import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as dashboardApi from '../api/dashboard.api';
import { toDateInputValue } from '../api/project.api';

// Same 4 Kanban statuses used on the board/task pages, each mapped to a
// fixed color so the pie chart and the per-project bars stay consistent.
const STATUS_COLORS = {
  'To Do': '#9ca3af',
  'In Progress': '#2563eb',
  Review: '#f59e0b',
  Done: '#16a34a',
};

export default function DashboardPage() {
  const { user } = useAuth();

  const [summary, setSummary] = useState(null);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    Promise.all([dashboardApi.getSummary(), dashboardApi.listOverdueTasks()])
      .then(([s, overdue]) => {
        setSummary(s);
        setOverdueTasks(overdue);
      })
      .catch((err) => setLoadError(err.response?.data?.error?.message || 'Could not load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="page">Loading dashboard...</p>;
  if (loadError) return <p className="page form-error">{loadError}</p>;

  const { totals, status_breakdown: statusBreakdown, by_project: byProject } = summary;

  // Build the conic-gradient stops for the pie chart: each status gets a
  // slice proportional to its share of totals.tasks, in cumulative percent.
  let pieBackground = '#e5e7eb'; // flat gray placeholder when there are no tasks yet
  if (totals.tasks > 0) {
    let cumulative = 0;
    const stops = statusBreakdown.map(({ status, count }) => {
      const start = cumulative;
      cumulative += (count / totals.tasks) * 100;
      return `${STATUS_COLORS[status]} ${start}% ${cumulative}%`;
    });
    pieBackground = `conic-gradient(${stops.join(', ')})`;
  }

  return (
    <div className="page page-wide">
      <h1>Dashboard</h1>
      <p className="auth-subtitle">
        Welcome, {user.name} ({user.role})
      </p>

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-value">{totals.projects}</span>
          <span className="stat-label">Projects</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totals.tasks}</span>
          <span className="stat-label">Tasks</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totals.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totals.in_progress}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat-card stat-card-warning">
          <span className="stat-value">{totals.overdue}</span>
          <span className="stat-label">Overdue</span>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Task status breakdown</h2>
        {totals.tasks === 0 ? (
          <p>No tasks yet.</p>
        ) : (
          <div className="chart-row">
            <div className="pie-chart" style={{ background: pieBackground }} />
            <div className="chart-legend">
              {statusBreakdown.map(({ status, count }) => (
                <div className="legend-item" key={status}>
                  <span className="legend-swatch" style={{ backgroundColor: STATUS_COLORS[status] }} />
                  {status}: {count}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <h2>Tasks by project</h2>
        {byProject.length === 0 && <p>No projects yet.</p>}
        {byProject.map((p) => (
          <div className="project-bar-row" key={p.project_id}>
            <Link to={`/projects/${p.project_id}`} className="project-bar-label">
              {p.project_name}
            </Link>
            <div className="project-bar">
              {Number(p.total_count) === 0 ? (
                <span className="project-bar-empty">No tasks</span>
              ) : (
                statusBreakdown.map(({ status }) => {
                  const key = { 'To Do': 'todo_count', 'In Progress': 'in_progress_count', Review: 'review_count', Done: 'done_count' }[
                    status
                  ];
                  const count = Number(p[key]);
                  if (count === 0) return null;
                  return (
                    <span
                      key={status}
                      className="project-bar-segment"
                      style={{ flexGrow: count, backgroundColor: STATUS_COLORS[status] }}
                      title={`${status}: ${count}`}
                    />
                  );
                })
              )}
            </div>
            <span className="project-bar-total">{p.total_count}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-section">
        <h2>Overdue tasks</h2>
        {overdueTasks.length === 0 && <p>Nothing overdue. Nice work.</p>}
        {overdueTasks.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Assignee</th>
                <th>Due date</th>
                <th>Days overdue</th>
              </tr>
            </thead>
            <tbody>
              {overdueTasks.map((t) => (
                <tr key={t.task_id}>
                  <td>
                    <Link to={`/tasks/${t.task_id}`}>{t.title}</Link>
                  </td>
                  <td>{t.project_name}</td>
                  <td>{t.assignee_name || 'Unassigned'}</td>
                  <td>{toDateInputValue(t.due_date)}</td>
                  <td className="task-card-overdue">{t.days_overdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
