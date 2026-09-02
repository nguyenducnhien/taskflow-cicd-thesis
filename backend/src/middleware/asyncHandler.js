// Wraps an async route handler so a rejected Promise (a thrown error inside
// `async`) is forwarded to next(err) instead of crashing/hanging the request.
// Express 4 does not do this automatically for async functions.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
