const express = require('express');
const controller = require('./auth.controller');
const { registerRules, loginRules, updateProfileRules } = require('./auth.validation');
const validate = require('../../middleware/validate');
const { protect } = require('../../middleware/auth.middleware');

const router = express.Router();

router.post('/register', registerRules, validate, controller.register);
router.post('/login', loginRules, validate, controller.login);
router.post('/logout', protect, controller.logout);
router.get('/me', protect, controller.getMe);
router.put('/profile', protect, updateProfileRules, validate, controller.updateProfile);

module.exports = router;
