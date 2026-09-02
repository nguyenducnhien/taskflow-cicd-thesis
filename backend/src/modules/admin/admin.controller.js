const bcrypt = require('bcryptjs');
const pool = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { sendSuccess } = require('../../utils/apiResponse');
const asyncHandler = require('../../middleware/asyncHandler');

function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar,
    role: row.role_name,
    status: row.status,
    created_at: row.created_at,
  };
}

async function findUserWithRoleById(id) {
  const [rows] = await pool.query(
    `SELECT u.*, r.name AS role_name
     FROM User u JOIN Role r ON r.id = u.role_id
     WHERE u.id = ?`,
    [id]
  );
  return rows[0];
}

const listUsers = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT u.*, r.name AS role_name
     FROM User u JOIN Role r ON r.id = u.role_id
     ORDER BY u.id ASC`
  );
  sendSuccess(res, { users: rows.map(toPublicUser) });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await findUserWithRoleById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }
  sendSuccess(res, { user: toPublicUser(user) });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const target = await findUserWithRoleById(id);
  if (!target) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }
  // An admin locking their own only account would lock themselves out of the
  // admin panel with no other admin able to reverse it in this simple system.
  if (Number(id) === req.user.id) {
    throw new ApiError(400, 'CANNOT_MODIFY_SELF', 'You cannot change your own account status');
  }

  await pool.query('UPDATE User SET status = ? WHERE id = ?', [status, id]);
  const updated = await findUserWithRoleById(id);
  sendSuccess(res, { user: toPublicUser(updated) });
});

const updateRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const target = await findUserWithRoleById(id);
  if (!target) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }
  // Prevent an admin from demoting themselves and losing admin access, same
  // reasoning as the self-lock guard above.
  if (Number(id) === req.user.id) {
    throw new ApiError(400, 'CANNOT_MODIFY_SELF', 'You cannot change your own role');
  }

  const [roleRows] = await pool.query('SELECT id FROM Role WHERE name = ?', [role]);
  if (roleRows.length === 0) {
    throw new ApiError(400, 'INVALID_ROLE', `Role '${role}' does not exist`);
  }

  await pool.query('UPDATE User SET role_id = ? WHERE id = ?', [roleRows[0].id, id]);
  const updated = await findUserWithRoleById(id);
  sendSuccess(res, { user: toPublicUser(updated) });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { new_password: newPassword } = req.body;

  const target = await findUserWithRoleById(id);
  if (!target) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE User SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  sendSuccess(res, { message: 'Password reset successfully' });
});

module.exports = { listUsers, getUserById, updateStatus, updateRole, resetPassword };
