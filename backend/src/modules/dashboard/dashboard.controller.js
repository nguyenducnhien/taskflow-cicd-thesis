const pool = require('../../config/db');
const { sendSuccess } = require('../../utils/apiResponse');
const asyncHandler = require('../../middleware/asyncHandler');

// Same visibility rule as listProjects (project.controller.js): Admin sees
// every project system-wide, a regular Member only sees projects they
// actually belong to. The dashboard is a summary of "what I can see", so it
// follows the same scoping rather than introducing a separate rule.
async function getProjectTaskStats(user) {
  if (user.role === 'Admin') {
    const [rows] = await pool.query('SELECT * FROM v_project_task_stats ORDER BY project_name ASC');
    return rows;
  }
  const [rows] = await pool.query(
    `SELECT v.* FROM v_project_task_stats v
     JOIN ProjectMember pm ON pm.project_id = v.project_id
     WHERE pm.user_id = ?
     ORDER BY v.project_name ASC`,
    [user.id]
  );
  return rows;
}

async function getOverdueTasks(user) {
  if (user.role === 'Admin') {
    const [rows] = await pool.query('SELECT * FROM v_overdue_tasks ORDER BY days_overdue DESC');
    return rows;
  }
  const [rows] = await pool.query(
    `SELECT v.* FROM v_overdue_tasks v
     JOIN ProjectMember pm ON pm.project_id = v.project_id
     WHERE pm.user_id = ?
     ORDER BY v.days_overdue DESC`,
    [user.id]
  );
  return rows;
}

const getSummary = asyncHandler(async (req, res) => {
  const [projectStats, overdueTasks] = await Promise.all([
    getProjectTaskStats(req.user),
    getOverdueTasks(req.user),
  ]);

  // v_project_task_stats returns SUM(...) aggregates as strings via mysql2
  // in some configs, so coerce with Number() before adding across projects.
  const totals = projectStats.reduce(
    (acc, p) => {
      acc.tasks += Number(p.total_count);
      acc.todo += Number(p.todo_count);
      acc.in_progress += Number(p.in_progress_count);
      acc.review += Number(p.review_count);
      acc.completed += Number(p.done_count);
      return acc;
    },
    { tasks: 0, todo: 0, in_progress: 0, review: 0, completed: 0 }
  );

  sendSuccess(res, {
    totals: {
      projects: projectStats.length,
      tasks: totals.tasks,
      completed: totals.completed,
      in_progress: totals.in_progress,
      overdue: overdueTasks.length,
    },
    // Pie chart: overall task status distribution across every visible project.
    status_breakdown: [
      { status: 'To Do', count: totals.todo },
      { status: 'In Progress', count: totals.in_progress },
      { status: 'Review', count: totals.review },
      { status: 'Done', count: totals.completed },
    ],
    // Bar chart: per-project status breakdown, straight from the view.
    by_project: projectStats,
  });
});

const listOverdueTasks = asyncHandler(async (req, res) => {
  const overdueTasks = await getOverdueTasks(req.user);
  sendSuccess(res, { overdue_tasks: overdueTasks });
});

module.exports = { getSummary, listOverdueTasks };
