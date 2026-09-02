const express = require('express');
const controller = require('./notification.controller');
const { idParamRules, listQueryRules } = require('./notification.validation');
const validate = require('../../middleware/validate');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/', listQueryRules, validate, controller.listNotifications);
router.patch('/read-all', controller.markAllAsRead);
router.patch('/:id/read', idParamRules, validate, controller.markAsRead);

module.exports = router;
