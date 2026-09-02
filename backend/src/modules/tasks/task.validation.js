const { param, body, query } = require('express-validator');

const projectIdParamRules = [
  param('projectId').isInt({ min: 1 }).withMessage('projectId must be a positive integer').toInt(),
];

const taskIdParamRules = [
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer').toInt(),
];

const labelIdParamRules = [
  ...taskIdParamRules,
  param('labelId').isInt({ min: 1 }).withMessage('labelId must be a positive integer').toInt(),
];

const createTaskRules = [
  ...projectIdParamRules,
  body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be 2-200 characters'),
  body('description').optional({ nullable: true }).trim(),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage("priority must be 'low', 'medium' or 'high'"),
  body('assignee_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('assignee_id must be a positive integer').toInt(),
  body('due_date').optional({ nullable: true }).isISO8601().withMessage('due_date must be a valid date (YYYY-MM-DD)'),
];

const updateTaskRules = [
  ...taskIdParamRules,
  body('title').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Title must be 2-200 characters'),
  body('description').optional({ nullable: true }).trim(),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage("priority must be 'low', 'medium' or 'high'"),
  body('assignee_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('assignee_id must be a positive integer').toInt(),
  body('due_date').optional({ nullable: true }).isISO8601().withMessage('due_date must be a valid date (YYYY-MM-DD)'),
];

const updateStatusRules = [
  ...taskIdParamRules,
  body('status').isIn(['To Do', 'In Progress', 'Review', 'Done']).withMessage('Invalid status value'),
];

const listTasksRules = [
  ...projectIdParamRules,
  query('status').optional().isIn(['To Do', 'In Progress', 'Review', 'Done']).withMessage('Invalid status filter'),
  query('assignee_id').optional().isInt({ min: 1 }).toInt(),
  query('label_id').optional().isInt({ min: 1 }).toInt(),
  query('search').optional().trim(),
];

const addLabelRules = [
  ...taskIdParamRules,
  body('label_id').isInt({ min: 1 }).withMessage('label_id must be a positive integer').toInt(),
];

const createCommentRules = [
  ...taskIdParamRules,
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment must be 1-2000 characters'),
];

module.exports = {
  projectIdParamRules,
  taskIdParamRules,
  labelIdParamRules,
  createTaskRules,
  updateTaskRules,
  updateStatusRules,
  listTasksRules,
  addLabelRules,
  createCommentRules,
};
