const express = require('express');
const controller = require('./task.controller');
const { createTaskRules, listTasksRules } = require('./task.validation');
const validate = require('../../middleware/validate');
const { protect } = require('../../middleware/auth.middleware');

// mergeParams: true — this router is mounted at
// /api/projects/:projectId/tasks, and without mergeParams the child router
// cannot see :projectId from the parent mount path.
const router = express.Router({ mergeParams: true });

router.use(protect);

router.post('/', createTaskRules, validate, controller.createTask);
router.get('/', listTasksRules, validate, controller.listTasks);

module.exports = router;
