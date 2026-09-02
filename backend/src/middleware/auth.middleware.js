const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

// Authentication: "who are you?" Reads the Authorization: Bearer <token>
// header, verifies the JWT signature/expiry, and attaches the decoded
// payload ({ id, role, iat, exp }) to req.user for later middleware/
// controllers to use. Responds 401 if the token is missing/invalid/expired.
function protect(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header'));
  }

  const token = authHeader.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    next(new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }
}

// Authorization: "are you allowed to do this?" Must run AFTER protect(), since
// it reads req.user. Usage: requireRole('Admin') on a route.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action'));
    }
    next();
  };
}

module.exports = { protect, requireRole };
