const pool = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { sendSuccess } = require('../../utils/apiResponse');
const asyncHandler = require('../../middleware/asyncHandler');

const listLabels = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM Label ORDER BY name ASC');
  sendSuccess(res, { labels: rows });
});

const createLabel = asyncHandler(async (req, res) => {
  const { name, color = '#808080' } = req.body;

  const [existing] = await pool.query('SELECT id FROM Label WHERE name = ?', [name]);
  if (existing.length > 0) {
    throw new ApiError(409, 'LABEL_NAME_TAKEN', 'A label with this name already exists');
  }

  const [result] = await pool.query('INSERT INTO Label (name, color) VALUES (?, ?)', [name, color]);
  const [rows] = await pool.query('SELECT * FROM Label WHERE id = ?', [result.insertId]);
  sendSuccess(res, { label: rows[0] }, 201);
});

const updateLabel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, color } = req.body;

  const [existing] = await pool.query('SELECT * FROM Label WHERE id = ?', [id]);
  if (existing.length === 0) {
    throw new ApiError(404, 'LABEL_NOT_FOUND', 'Label not found');
  }

  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (color !== undefined) { fields.push('color = ?'); values.push(color); }

  if (fields.length === 0) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Provide at least one field to update');
  }

  values.push(id);
  await pool.query(`UPDATE Label SET ${fields.join(', ')} WHERE id = ?`, values);

  const [rows] = await pool.query('SELECT * FROM Label WHERE id = ?', [id]);
  sendSuccess(res, { label: rows[0] });
});

const deleteLabel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [existing] = await pool.query('SELECT id FROM Label WHERE id = ?', [id]);
  if (existing.length === 0) {
    throw new ApiError(404, 'LABEL_NOT_FOUND', 'Label not found');
  }

  // TaskLabel declares ON DELETE CASCADE against Label in schema.sql, so
  // this also removes the label from every task it was attached to.
  await pool.query('DELETE FROM Label WHERE id = ?', [id]);
  sendSuccess(res, { message: 'Label deleted' });
});

module.exports = { listLabels, createLabel, updateLabel, deleteLabel };
