const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Runs after express-validator's check(...)/body(...) rules. Those rules only
// collect errors; this middleware is what actually stops the request.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(422, 'VALIDATION_ERROR', 'Invalid input', errors.array()));
  }
  next();
}

module.exports = validate;
