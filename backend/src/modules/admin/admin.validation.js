const { param, body } = require('express-validator');

const idParamRules = [
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer').toInt(),
];

const statusRules = [
  ...idParamRules,
  body('status').isIn(['active', 'locked']).withMessage("status must be 'active' or 'locked'"),
];

const roleRules = [
  ...idParamRules,
  body('role').isIn(['Admin', 'Member']).withMessage("role must be 'Admin' or 'Member'"),
];

const resetPasswordRules = [
  ...idParamRules,
  body('new_password').isLength({ min: 8 }).withMessage('new_password must be at least 8 characters'),
];

module.exports = { idParamRules, statusRules, roleRules, resetPasswordRules };
