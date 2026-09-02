const express = require('express');
const controller = require('./label.controller');
const { idParamRules, createLabelRules, updateLabelRules } = require('./label.validation');
const validate = require('../../middleware/validate');
const { protect, requireRole } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

// Labels are a small shared taxonomy used across every project (e.g. "Bug",
// "Feature"), so only Admin manages the set of labels that exist. Any
// authenticated user can read the list (needed for the label picker UI) and
// attach/detach existing labels on tasks they can edit (see task.routes.js).
router.get('/', controller.listLabels);
router.post('/', requireRole('Admin'), createLabelRules, validate, controller.createLabel);
router.put('/:id', requireRole('Admin'), updateLabelRules, validate, controller.updateLabel);
router.delete('/:id', requireRole('Admin'), idParamRules, validate, controller.deleteLabel);

module.exports = router;
