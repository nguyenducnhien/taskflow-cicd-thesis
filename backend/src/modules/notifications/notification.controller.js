const pool = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { sendSuccess } = require('../../utils/apiResponse');
const asyncHandler = require('../../middleware/asyncHandler');

// Notifications are personal: every query/update here is scoped to
// req.user.id, no Admin override. There's nothing cross-user to manage —
// an Admin has their own notification list, not everyone else's.

const listNotifications = asyncHandler(async (req, res) => {
  const { is_read: isRead, limit = 20, offset = 0 } = req.query;

  const conditions = ['user_id = ?'];
  const params = [req.user.id];
  if (isRead !== undefined) {
    conditions.push('is_read = ?');
    params.push(isRead);
  }

  const [rows] = await pool.query(
    `SELECT * FROM Notification
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ unread_count: unreadCount }]] = await pool.query(
    'SELECT COUNT(*) AS unread_count FROM Notification WHERE user_id = ? AND is_read = 0',
    [req.user.id]
  );

  sendSuccess(res, { notifications: rows, unread_count: unreadCount });
});

const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [result] = await pool.query(
    'UPDATE Notification SET is_read = 1 WHERE id = ? AND user_id = ?',
    [id, req.user.id]
  );
  if (result.affectedRows === 0) {
    throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
  }

  const [rows] = await pool.query('SELECT * FROM Notification WHERE id = ?', [id]);
  sendSuccess(res, { notification: rows[0] });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await pool.query(
    'UPDATE Notification SET is_read = 1 WHERE user_id = ? AND is_read = 0',
    [req.user.id]
  );
  sendSuccess(res, { message: 'All notifications marked as read' });
});

module.exports = { listNotifications, markAsRead, markAllAsRead };
