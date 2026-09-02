function sendSuccess(res, data = null, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data, error: null });
}

module.exports = { sendSuccess };
