const pool = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { sendSuccess } = require('../../utils/apiResponse');
const asyncHandler = require('../../middleware/asyncHandler');

// The Task INSERT/UPDATE triggers in schema.sql read a session variable,
// @current_user_id, to record who actually performed the action (falling
// back to reporter_id if it was never set). Session variables live on a
// single MySQL connection — pool.query() can hand each call a different
// connection, so SET and UPDATE must run on the SAME connection or the
// trigger never sees the value. getConnection()/release() pins one.
async function runAsUser(userId, fn) {
  const conn = await pool.getConnection();
  try {
    await conn.query('SET @current_user_id = ?', [userId]);
    return await fn(conn);
  } finally {
    conn.release();
  }
}

async function findTaskById(id) {
  const [rows] = await pool.query(
    `SELECT t.*, p.name AS project_name,
            reporter.name AS reporter_name,
            assignee.name AS assignee_name
     FROM Task t
     JOIN Project p ON p.id = t.project_id
     JOIN User reporter ON reporter.id = t.reporter_id
     LEFT JOIN User assignee ON assignee.id = t.assignee_id
     WHERE t.id = ?`,
    [id]
  );
  return rows[0];
}

async function findLabelsForTask(taskId) {
  const [rows] = await pool.query(
    `SELECT l.id, l.name, l.color
     FROM TaskLabel tl JOIN Label l ON l.id = tl.label_id
     WHERE tl.task_id = ?`,
    [taskId]
  );
  return rows;
}

async function isProjectMember(projectId, userId) {
  const [rows] = await pool.query(
    'SELECT 1 FROM ProjectMember WHERE project_id = ? AND user_id = ?',
    [projectId, userId]
  );
  return rows.length > 0;
}

async function projectExists(projectId) {
  const [rows] = await pool.query('SELECT id FROM Project WHERE id = ?', [projectId]);
  return rows.length > 0;
}

// View access: Admin, or any member of the task's parent project.
async function assertCanView(task, user) {
  if (user.role === 'Admin') return;
  const member = await isProjectMember(task.project_id, user.id);
  if (!member) {
    throw new ApiError(403, 'FORBIDDEN', 'You are not a member of this task\'s project');
  }
}

// Edit content / change status: Admin, the reporter, or the assignee.
function assertCanEdit(task, user) {
  const allowed = user.role === 'Admin' || task.reporter_id === user.id || task.assignee_id === user.id;
  if (!allowed) {
    throw new ApiError(403, 'FORBIDDEN', 'Only the Admin, reporter, or assignee can modify this task');
  }
}

// Delete outright: Admin or the reporter ONLY — the assignee may edit/change
// status (see assertCanEdit) but must not be able to destroy the task.
function assertCanDelete(task, user) {
  const allowed = user.role === 'Admin' || task.reporter_id === user.id;
  if (!allowed) {
    throw new ApiError(403, 'FORBIDDEN', 'Only the Admin or reporter can delete this task');
  }
}

const createTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { title, description = null, priority = 'medium', assignee_id: assigneeId = null, due_date: dueDate = null } = req.body;

  if (!(await projectExists(projectId))) {
    throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }
  if (req.user.role !== 'Admin' && !(await isProjectMember(projectId, req.user.id))) {
    throw new ApiError(403, 'FORBIDDEN', 'You are not a member of this project');
  }
  if (assigneeId !== null && !(await isProjectMember(projectId, assigneeId))) {
    throw new ApiError(400, 'INVALID_ASSIGNEE', 'assignee_id must be a member of this project');
  }

  const [result] = await pool.query(
    `INSERT INTO Task (project_id, title, description, priority, assignee_id, reporter_id, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [projectId, title, description, priority, assigneeId, req.user.id, dueDate]
  );

  const task = await findTaskById(result.insertId);
  sendSuccess(res, { task: { ...task, labels: [] } }, 201);
});

const listTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status, assignee_id: assigneeId, label_id: labelId, search } = req.query;

  if (!(await projectExists(projectId))) {
    throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }
  if (req.user.role !== 'Admin' && !(await isProjectMember(projectId, req.user.id))) {
    throw new ApiError(403, 'FORBIDDEN', 'You are not a member of this project');
  }

  const conditions = ['t.project_id = ?'];
  const params = [projectId];

  if (status) { conditions.push('t.status = ?'); params.push(status); }
  if (assigneeId) { conditions.push('t.assignee_id = ?'); params.push(assigneeId); }
  if (search) { conditions.push('t.title LIKE ?'); params.push(`%${search}%`); }

  let joinLabel = '';
  if (labelId) {
    joinLabel = 'JOIN TaskLabel tl ON tl.task_id = t.id AND tl.label_id = ?';
    params.unshift(labelId); // JOIN params must precede WHERE params in the built query
  }

  const [rows] = await pool.query(
    `SELECT t.*, reporter.name AS reporter_name, assignee.name AS assignee_name
     FROM Task t
     JOIN User reporter ON reporter.id = t.reporter_id
     LEFT JOIN User assignee ON assignee.id = t.assignee_id
     ${joinLabel}
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.created_at DESC`,
    params
  );

  sendSuccess(res, { tasks: rows });
});

const getTaskById = asyncHandler(async (req, res) => {
  const task = await findTaskById(req.params.id);
  if (!task) {
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
  }
  await assertCanView(task, req.user);

  const labels = await findLabelsForTask(task.id);
  sendSuccess(res, { task: { ...task, labels } });
});

const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const task = await findTaskById(id);
  if (!task) {
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
  }
  assertCanEdit(task, req.user);

  const { title, description, priority, assignee_id: assigneeId, due_date: dueDate } = req.body;

  if (assigneeId !== undefined && assigneeId !== null && !(await isProjectMember(task.project_id, assigneeId))) {
    throw new ApiError(400, 'INVALID_ASSIGNEE', 'assignee_id must be a member of this project');
  }

  const fields = [];
  const values = [];
  if (title !== undefined) { fields.push('title = ?'); values.push(title); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
  if (assigneeId !== undefined) { fields.push('assignee_id = ?'); values.push(assigneeId); }
  if (dueDate !== undefined) { fields.push('due_date = ?'); values.push(dueDate); }

  if (fields.length === 0) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Provide at least one field to update');
  }

  values.push(id);
  await runAsUser(req.user.id, (conn) =>
    conn.query(`UPDATE Task SET ${fields.join(', ')} WHERE id = ?`, values)
  );

  const updated = await findTaskById(id);
  const labels = await findLabelsForTask(id);
  sendSuccess(res, { task: { ...updated, labels } });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const task = await findTaskById(id);
  if (!task) {
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
  }
  assertCanEdit(task, req.user);

  await runAsUser(req.user.id, (conn) =>
    conn.query('UPDATE Task SET status = ? WHERE id = ?', [status, id])
  );

  const updated = await findTaskById(id);
  sendSuccess(res, { task: updated });
});

const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const task = await findTaskById(id);
  if (!task) {
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
  }
  assertCanDelete(task, req.user);

  // Comment and TaskLabel both cascade from Task in schema.sql.
  await pool.query('DELETE FROM Task WHERE id = ?', [id]);
  sendSuccess(res, { message: 'Task deleted' });
});

const addLabel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { label_id: labelId } = req.body;

  const task = await findTaskById(id);
  if (!task) {
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
  }
  assertCanEdit(task, req.user);

  const [labelRows] = await pool.query('SELECT id FROM Label WHERE id = ?', [labelId]);
  if (labelRows.length === 0) {
    throw new ApiError(404, 'LABEL_NOT_FOUND', 'Label not found');
  }

  const [existing] = await pool.query(
    'SELECT 1 FROM TaskLabel WHERE task_id = ? AND label_id = ?',
    [id, labelId]
  );
  if (existing.length > 0) {
    throw new ApiError(409, 'ALREADY_LABELED', 'This label is already on the task');
  }

  await pool.query('INSERT INTO TaskLabel (task_id, label_id) VALUES (?, ?)', [id, labelId]);
  const labels = await findLabelsForTask(id);
  sendSuccess(res, { labels }, 201);
});

const removeLabel = asyncHandler(async (req, res) => {
  const { id, labelId } = req.params;

  const task = await findTaskById(id);
  if (!task) {
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
  }
  assertCanEdit(task, req.user);

  const [result] = await pool.query(
    'DELETE FROM TaskLabel WHERE task_id = ? AND label_id = ?',
    [id, labelId]
  );
  if (result.affectedRows === 0) {
    throw new ApiError(404, 'NOT_LABELED', 'This label is not on the task');
  }

  const labels = await findLabelsForTask(id);
  sendSuccess(res, { labels });
});

const listComments = asyncHandler(async (req, res) => {
  const task = await findTaskById(req.params.id);
  if (!task) {
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
  }
  await assertCanView(task, req.user);

  const [rows] = await pool.query(
    `SELECT c.*, u.name AS author_name
     FROM Comment c JOIN User u ON u.id = c.user_id
     WHERE c.task_id = ?
     ORDER BY c.created_at ASC`,
    [req.params.id]
  );
  sendSuccess(res, { comments: rows });
});

const createComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  const task = await findTaskById(id);
  if (!task) {
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
  }
  // Commenting is intentionally open to any project member, not just the
  // reporter/assignee/Admin who can edit the task itself — this matches how
  // discussion threads work in Jira/Trello.
  await assertCanView(task, req.user);

  const [result] = await pool.query(
    'INSERT INTO Comment (task_id, user_id, content) VALUES (?, ?, ?)',
    [id, req.user.id, content]
  );

  const [rows] = await pool.query(
    `SELECT c.*, u.name AS author_name FROM Comment c JOIN User u ON u.id = c.user_id WHERE c.id = ?`,
    [result.insertId]
  );
  sendSuccess(res, { comment: rows[0] }, 201);
});

module.exports = {
  createTask,
  listTasks,
  getTaskById,
  updateTask,
  updateStatus,
  deleteTask,
  addLabel,
  removeLabel,
  listComments,
  createComment,
};
