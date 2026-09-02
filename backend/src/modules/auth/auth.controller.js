const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { sendSuccess } = require('../../utils/apiResponse');
const asyncHandler = require('../../middleware/asyncHandler');

// Role.id for 'Member' in database/seed.sql. Self-registration always
// creates a Member — nobody can register themselves as Admin.
const MEMBER_ROLE_ID = 2;

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

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

async function findUserWithRoleByEmail(email) {
  const [rows] = await pool.query(
    `SELECT u.*, r.name AS role_name
     FROM User u JOIN Role r ON r.id = u.role_id
     WHERE u.email = ?`,
    [email]
  );
  return rows[0];
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

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await findUserWithRoleByEmail(email);
  if (existing) {
    throw new ApiError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    'INSERT INTO User (name, email, password_hash, role_id, status) VALUES (?, ?, ?, ?, ?)',
    [name, email, passwordHash, MEMBER_ROLE_ID, 'active']
  );

  const user = await findUserWithRoleById(result.insertId);
  const token = signToken(user);

  sendSuccess(res, { user: toPublicUser(user), token }, 201);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await findUserWithRoleByEmail(email);
  if (!user) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }
  if (user.status === 'locked') {
    throw new ApiError(403, 'ACCOUNT_LOCKED', 'This account has been locked by an administrator');
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  const token = signToken(user);
  sendSuccess(res, { user: toPublicUser(user), token });
});

const logout = asyncHandler(async (req, res) => {
  // JWT auth is stateless: the server issued no session to destroy. "Logout"
  // here just confirms the request was authenticated; the actual logout
  // action is the frontend deleting its stored token. See chat explanation
  // for the trade-off vs. a server-side token blocklist.
  sendSuccess(res, { message: 'Logged out' });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await findUserWithRoleById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'NOT_FOUND', 'User not found');
  }
  sendSuccess(res, { user: toPublicUser(user) });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, avatar } = req.body;
  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (avatar !== undefined) { fields.push('avatar = ?'); values.push(avatar); }

  if (fields.length === 0) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Provide at least one field to update (name or avatar)');
  }

  values.push(req.user.id);
  await pool.query(`UPDATE User SET ${fields.join(', ')} WHERE id = ?`, values);

  const user = await findUserWithRoleById(req.user.id);
  sendSuccess(res, { user: toPublicUser(user) });
});

module.exports = { register, login, logout, getMe, updateProfile };
