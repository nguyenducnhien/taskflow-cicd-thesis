const { param, body } = require('express-validator');

const idParamRules = [
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer').toInt(),
];

const memberParamRules = [
  ...idParamRules,
  param('userId').isInt({ min: 1 }).withMessage('userId must be a positive integer').toInt(),
];

const createProjectRules = [
  body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Name must be 2-150 characters'),
  body('description').optional({ nullable: true }).trim(),
  body('start_date').optional({ nullable: true }).isISO8601().withMessage('start_date must be a valid date (YYYY-MM-DD)'),
  body('end_date').optional({ nullable: true }).isISO8601().withMessage('end_date must be a valid date (YYYY-MM-DD)'),
];

const updateProjectRules = [
  ...idParamRules,
  body('name').optional().trim().isLength({ min: 2, max: 150 }).withMessage('Name must be 2-150 characters'),
  body('description').optional({ nullable: true }).trim(),
  body('start_date').optional({ nullable: true }).isISO8601().withMessage('start_date must be a valid date (YYYY-MM-DD)'),
  body('end_date').optional({ nullable: true }).isISO8601().withMessage('end_date must be a valid date (YYYY-MM-DD)'),
  body('status').optional().isIn(['active', 'completed', 'archived']).withMessage("status must be 'active', 'completed' or 'archived'"),
];

const addMemberRules = [
  ...idParamRules,
  body('user_id').isInt({ min: 1 }).withMessage('user_id must be a positive integer').toInt(),
];

module.exports = {
  idParamRules,
  memberParamRules,
  createProjectRules,
  updateProjectRules,
  addMemberRules,
};
