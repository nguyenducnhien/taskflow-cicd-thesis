const express = require('express');
const controller = require('./task.controller');
const {
  taskIdParamRules,
  labelIdParamRules,
  updateTaskRules,
  updateStatusRules,
  addLabelRules,
  createCommentRules,
} = require('./task.validation');
const validate = require('../../middleware/validate');
const { protect } = require('../../middleware/auth.middleware');

// Top-level /api/tasks/:id routes — a task id is globally unique, so these
// don't need the project id in the URL. Mounted separately from
// task.routes.js (which handles project-scoped create/list).
const router = express.Router();

router.use(protect);

router.get('/:id', taskIdParamRules, validate, controller.getTaskById);
router.put('/:id', updateTaskRules, validate, controller.updateTask);
router.delete('/:id', taskIdParamRules, validate, controller.deleteTask);
router.patch('/:id/status', updateStatusRules, validate, controller.updateStatus);

router.post('/:id/labels', addLabelRules, validate, controller.addLabel);
router.delete('/:id/labels/:labelId', labelIdParamRules, validate, controller.removeLabel);

router.get('/:id/comments', taskIdParamRules, validate, controller.listComments);
router.post('/:id/comments', createCommentRules, validate, controller.createComment);

module.exports = router;
