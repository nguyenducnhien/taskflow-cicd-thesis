const pool = require('../config/db');

// "Deadline approaching" has no single INSERT/UPDATE row event to hang a
// trigger off (schema.sql deliberately leaves it out of trg_task_after_*
// for this reason) — it depends on the current date drifting toward a
// due_date that was set earlier. That means it can only be produced by
// something that re-checks the clock on a schedule. For this thesis that
// "something" is this in-process interval (see server.js); the DevOps
// report should note that in a real deployment this belongs in a
// standalone scheduled job (cron container, or AWS EventBridge -> Lambda)
// so it keeps running even if the API process restarts or is scaled to
// multiple instances — running it inside the API process means N replicas
// would each fire it independently and duplicate-check against the DB N
// times, which doesn't break correctness (dedupe below still holds) but
// wastes work.
async function checkApproachingDeadlines() {
  const [tasks] = await pool.query(
    `SELECT t.id, t.title, t.due_date, t.assignee_id
     FROM Task t
     WHERE t.assignee_id IS NOT NULL
       AND t.status <> 'Done'
       AND t.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 1 DAY)`
  );

  for (const task of tasks) {
    const content = `Task "${task.title}" is due soon (${task.due_date.toISOString().slice(0, 10)})`;

    // Notification has no task_id column (fixed data model — see CLAUDE.md),
    // so dedupe by matching the exact content we'd insert for this user
    // within the last day. Good enough to stop the same task from spamming
    // the same user every time this job runs, without needing a schema change.
    const [existing] = await pool.query(
      `SELECT 1 FROM Notification
       WHERE user_id = ? AND type = 'deadline_approaching' AND content = ?
         AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)`,
      [task.assignee_id, content]
    );
    if (existing.length > 0) continue;

    await pool.query(
      `INSERT INTO Notification (user_id, type, content, is_read, created_at)
       VALUES (?, 'deadline_approaching', ?, 0, NOW())`,
      [task.assignee_id, content]
    );
  }
}

module.exports = { checkApproachingDeadlines };
