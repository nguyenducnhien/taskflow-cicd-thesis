// A typed error for expected failures (bad input, wrong password, not found).
// Route code does `throw new ApiError(...)`; the central error handler turns
// any ApiError into the standard { success:false, error:{...} } response.
class ApiError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

module.exports = ApiError;
