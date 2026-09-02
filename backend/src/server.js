const app = require('./app');
const { checkApproachingDeadlines } = require('./jobs/deadlineNotifier');

const PORT = process.env.PORT || 5000;
const DEADLINE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);

  checkApproachingDeadlines().catch((err) => console.error('Deadline check failed:', err));
  setInterval(() => {
    checkApproachingDeadlines().catch((err) => console.error('Deadline check failed:', err));
  }, DEADLINE_CHECK_INTERVAL_MS);
});
