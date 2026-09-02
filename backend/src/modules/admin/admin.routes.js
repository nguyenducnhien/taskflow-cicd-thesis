const express = require('express');
const controller = require('./admin.controller');
const { idParamRules, statusRules, roleRules, resetPasswordRules } = require('./admin.validation');
const validate = require('../../middleware/validate');
const { protect, requireRole } = require('../../middleware/auth.middleware');

const router = express.Router();

// Every route below requires a valid token AND the Admin role.
router.use(protect, requireRole('Admin'));

router.get('/users', controller.listUsers);
router.get('/users/:id', idParamRules, validate, controller.getUserById);
router.patch('/users/:id/status', statusRules, validate, controller.updateStatus);
router.patch('/users/:id/role', roleRules, validate, controller.updateRole);
router.patch('/users/:id/password', resetPasswordRules, validate, controller.resetPassword);

module.exports = router;
