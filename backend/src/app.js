require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./modules/auth/auth.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const projectRoutes = require('./modules/projects/project.routes');
const taskRoutes = require('./modules/tasks/task.routes');
const taskItemRoutes = require('./modules/tasks/taskItem.routes');
const labelRoutes = require('./modules/labels/label.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// CORS: the React frontend (e.g. http://localhost:3000) and this API
// (e.g. http://localhost:5000) are different origins (different port), so
// browsers block the frontend's fetch/axios calls by default unless this
// server explicitly says "this origin may call me" via response headers.
// The `cors` package adds those headers for us based on CORS_ORIGIN.
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' }, error: null });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/tasks', taskItemRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Must be registered after all routes.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
