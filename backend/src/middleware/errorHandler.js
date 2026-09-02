const ApiError = require('../utils/ApiError');

function notFoundHandler(req, res, next) {
  next(new ApiError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`));
}

// Must be registered LAST, after all routes: Express recognizes an error
// handler by its 4-argument signature (err, req, res, next).
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      data: null,
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Unexpected error (bug, DB connection failure, etc.) — log full detail
  // server-side, but never leak internals (stack traces, SQL) to the client.
  console.error(err);
  return res.status(500).json({
    success: false,
    data: null,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
}

module.exports = { notFoundHandler, errorHandler };
