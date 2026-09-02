const pool = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { sendSuccess } = require('../../utils/apiResponse');
const asyncHandler = require('../../middleware/asyncHandler');

async function findProjectById(id) {
  const [rows] = await pool.query(
    `SELECT p.*, u.name AS owner_name
     FROM Project p JOIN User u ON u.id = p.owner_id
     WHERE p.id = ?`,
    [id]
  );
  return rows[0];
}

async function isMember(projectId, userId) {
  const [rows] = await pool.query(
    'SELECT 1 FROM ProjectMember WHERE project_id = ? AND user_id = ?',
    [projectId, userId]
  );
  return rows.length > 0;
}

// Role-based middleware (requireRole) only knows the requester's role — it
// runs before any DB query, so it can't know who owns a specific project.
// "Can this user edit *this* project" depends on data (project.owner_id),
// so that check has to happen here, in the controller, after the project
// has been loaded from the DB.
function assertCanManage(project, user) {
  if (user.role !== 'Admin' && project.owner_id !== user.id) {
    throw new ApiError(403, 'FORBIDDEN', 'Only the project owner or an Admin can do this');
  }
}

const createProject = asyncHandler(async (req, res) => {
  const { name, description = null, start_date: startDate = null, end_date: endDate = null } = req.body;

  if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'end_date cannot be before start_date');
  }

  const [result] = await pool.query(
    `INSERT INTO Project (name, description, start_date, end_date, owner_id)
     VALUES (?, ?, ?, ?, ?)`,
    [name, description, startDate, endDate, req.user.id]
  );

  // The owner is always also a ProjectMember row, so "projects I belong to"
  // and "projects I own" can be answered with a single membership query.
  await pool.query(
    'INSERT INTO ProjectMember (project_id, user_id) VALUES (?, ?)',
    [result.insertId, req.user.id]
  );

  const project = await findProjectById(result.insertId);
  sendSuccess(res, { project }, 201);
});

const listProjects = asyncHandler(async (req, res) => {
  let rows;
  if (req.user.role === 'Admin') {
    [rows] = await pool.query(
      `SELECT p.*, u.name AS owner_name
       FROM Project p JOIN User u ON u.id = p.owner_id
       ORDER BY p.created_at DESC`
    );
  } else {
    [rows] = await pool.query(
      `SELECT p.*, u.name AS owner_name
       FROM Project p
       JOIN User u ON u.id = p.owner_id
       JOIN ProjectMember pm ON pm.project_id = p.id
       WHERE pm.user_id = ?
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
  }
  sendSuccess(res, { projects: rows });
});

const getProjectById = asyncHandler(async (req, res) => {
  const project = await findProjectById(req.params.id);
  if (!project) {
    throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }

  const allowed = req.user.role === 'Admin' || (await isMember(project.id, req.user.id));
  if (!allowed) {
    throw new ApiError(403, 'FORBIDDEN', 'You are not a member of this project');
  }

  sendSuccess(res, { project });
});

const updateProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const project = await findProjectById(id);
  if (!project) {
    throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }
  assertCanManage(project, req.user);

  const { name, description, start_date: startDate, end_date: endDate, status } = req.body;
  const effectiveStart = startDate !== undefined ? startDate : project.start_date;
  const effectiveEnd = endDate !== undefined ? endDate : project.end_date;
  if (effectiveStart && effectiveEnd && new Date(effectiveEnd) < new Date(effectiveStart)) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'end_date cannot be before start_date');
  }

  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (startDate !== undefined) { fields.push('start_date = ?'); values.push(startDate); }
  if (endDate !== undefined) { fields.push('end_date = ?'); values.push(endDate); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }

  if (fields.length === 0) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Provide at least one field to update');
  }

  values.push(id);
  await pool.query(`UPDATE Project SET ${fields.join(', ')} WHERE id = ?`, values);

  const updated = await findProjectById(id);
  sendSuccess(res, { project: updated });
});

const deleteProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const project = await findProjectById(id);
  if (!project) {
    throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }
  assertCanManage(project, req.user);

  // ProjectMember and Task both declare ON DELETE CASCADE against Project
  // in schema.sql, and Comment/TaskLabel cascade from Task in turn — so
  // this single DELETE removes the whole project tree; no manual cleanup.
  await pool.query('DELETE FROM Project WHERE id = ?', [id]);
  sendSuccess(res, { message: 'Project deleted' });
});

const listMembers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const project = await findProjectById(id);
  if (!project) {
    throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }

  const allowed = req.user.role === 'Admin' || (await isMember(project.id, req.user.id));
  if (!allowed) {
    throw new ApiError(403, 'FORBIDDEN', 'You are not a member of this project');
  }

  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.avatar
     FROM ProjectMember pm JOIN User u ON u.id = pm.user_id
     WHERE pm.project_id = ?
     ORDER BY u.name ASC`,
    [id]
  );
  sendSuccess(res, { members: rows });
});

const addMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user_id: userId } = req.body;

  const project = await findProjectById(id);
  if (!project) {
    throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }
  assertCanManage(project, req.user);

  const [userRows] = await pool.query('SELECT id FROM User WHERE id = ?', [userId]);
  if (userRows.length === 0) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  if (await isMember(id, userId)) {
    throw new ApiError(409, 'ALREADY_MEMBER', 'User is already a member of this project');
  }

  await pool.query('INSERT INTO ProjectMember (project_id, user_id) VALUES (?, ?)', [id, userId]);
  sendSuccess(res, { message: 'Member added' }, 201);
});

const removeMember = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;

  const project = await findProjectById(id);
  if (!project) {
    throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }
  assertCanManage(project, req.user);

  if (Number(userId) === project.owner_id) {
    throw new ApiError(400, 'CANNOT_REMOVE_OWNER', 'The project owner cannot be removed from the project');
  }

  const [result] = await pool.query(
    'DELETE FROM ProjectMember WHERE project_id = ? AND user_id = ?',
    [id, userId]
  );
  if (result.affectedRows === 0) {
    throw new ApiError(404, 'NOT_A_MEMBER', 'This user is not a member of the project');
  }

  sendSuccess(res, { message: 'Member removed' });
});

module.exports = {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
  deleteProject,
  listMembers,
  addMember,
  removeMember,
};
