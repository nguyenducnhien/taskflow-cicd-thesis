const { param, body } = require('express-validator');

const idParamRules = [
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer').toInt(),
];

const createLabelRules = [
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Name must be 1-50 characters'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('color must be a hex code like #FF0000'),
];

const updateLabelRules = [
  ...idParamRules,
  body('name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Name must be 1-50 characters'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('color must be a hex code like #FF0000'),
];

module.exports = { idParamRules, createLabelRules, updateLabelRules };
