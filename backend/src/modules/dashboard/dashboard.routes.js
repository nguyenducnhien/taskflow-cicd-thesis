const express = require('express');
const controller = require('./dashboard.controller');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(protect);

router.get('/summary', controller.getSummary);
router.get('/overdue-tasks', controller.listOverdueTasks);

module.exports = router;
