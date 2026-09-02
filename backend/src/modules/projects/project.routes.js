const express = require('express');
const controller = require('./project.controller');
const {
  idParamRules,
  memberParamRules,
  createProjectRules,
  updateProjectRules,
  addMemberRules,
} = require('./project.validation');
const validate = require('../../middleware/validate');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

// Authentication only here — ownership/Admin checks happen inside the
// controller because they depend on which project is being accessed.
router.use(protect);

router.post('/', createProjectRules, validate, controller.createProject);
router.get('/', controller.listProjects);
router.get('/:id', idParamRules, validate, controller.getProjectById);
router.put('/:id', updateProjectRules, validate, controller.updateProject);
router.delete('/:id', idParamRules, validate, controller.deleteProject);

router.get('/:id/members', idParamRules, validate, controller.listMembers);
router.post('/:id/members', addMemberRules, validate, controller.addMember);
router.delete('/:id/members/:userId', memberParamRules, validate, controller.removeMember);

module.exports = router;
