const { param, query } = require('express-validator');

const idParamRules = [
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer').toInt(),
];

const listQueryRules = [
  query('is_read').optional().isIn(['0', '1']).withMessage('is_read must be 0 or 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100').toInt(),
  query('offset').optional().isInt({ min: 0 }).withMessage('offset must be >= 0').toInt(),
];

module.exports = { idParamRules, listQueryRules };
