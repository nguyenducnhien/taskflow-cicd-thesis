-- =====================================================================
-- Task Management System — Database Schema
-- Thesis: CI/CD Pipeline Integrated with Automated Testing and
--         Monitoring for a Task Management System on AWS
--
-- Run order in this project's database/ folder:
--   1. schema.sql  (this file)  — tables, views, triggers
--   2. seed.sql                 — sample data + test accounts
--
-- DB_NAME below (task_manager_db) must match the DB_NAME your backend's
-- .env file uses in Giai doan 3 — see seed.sql and the .env note.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS task_manager_db;
USE task_manager_db;

-- ---------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------

CREATE TABLE Role (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(50) NOT NULL,
  permissions  JSON NULL,
  UNIQUE KEY uq_role_name (name)
) ENGINE=InnoDB;

CREATE TABLE User (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  avatar         VARCHAR(255) NULL,
  role_id        INT UNSIGNED NOT NULL,
  status         ENUM('active','locked') NOT NULL DEFAULT 'active',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                 ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_email (email),
  KEY idx_user_role (role_id),
  CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES Role(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Project (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(150) NOT NULL,
  description  TEXT NULL,
  start_date   DATE NULL,
  end_date     DATE NULL,
  status       ENUM('active','completed','archived') NOT NULL DEFAULT 'active',
  owner_id     INT UNSIGNED NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_project_owner (owner_id),
  KEY idx_project_status (status),
  CONSTRAINT fk_project_owner FOREIGN KEY (owner_id) REFERENCES User(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ProjectMember (
  project_id  INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  PRIMARY KEY (project_id, user_id),
  KEY idx_projectmember_user (user_id),
  CONSTRAINT fk_pm_project FOREIGN KEY (project_id) REFERENCES Project(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pm_user FOREIGN KEY (user_id) REFERENCES User(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Task (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id   INT UNSIGNED NOT NULL,
  title        VARCHAR(200) NOT NULL,
  description  TEXT NULL,
  priority     ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  assignee_id  INT UNSIGNED NULL,
  reporter_id  INT UNSIGNED NOT NULL,
  status       ENUM('To Do','In Progress','Review','Done') NOT NULL DEFAULT 'To Do',
  due_date     DATE NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
               ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_task_project (project_id),
  KEY idx_task_assignee (assignee_id),
  KEY idx_task_status (status),
  KEY idx_task_due_date (due_date),
  KEY idx_task_project_status (project_id, status),
  CONSTRAINT fk_task_project FOREIGN KEY (project_id) REFERENCES Project(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_task_assignee FOREIGN KEY (assignee_id) REFERENCES User(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_task_reporter FOREIGN KEY (reporter_id) REFERENCES User(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Label (
  id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name   VARCHAR(50) NOT NULL,
  color  VARCHAR(7) NOT NULL DEFAULT '#808080',
  UNIQUE KEY uq_label_name (name)
) ENGINE=InnoDB;

CREATE TABLE TaskLabel (
  task_id   INT UNSIGNED NOT NULL,
  label_id  INT UNSIGNED NOT NULL,
  PRIMARY KEY (task_id, label_id),
  KEY idx_tasklabel_label (label_id),
  CONSTRAINT fk_tl_task FOREIGN KEY (task_id) REFERENCES Task(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_tl_label FOREIGN KEY (label_id) REFERENCES Label(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Comment (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  task_id     INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  content     TEXT NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_comment_task (task_id),
  KEY idx_comment_user (user_id),
  CONSTRAINT fk_comment_task FOREIGN KEY (task_id) REFERENCES Task(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES User(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- entity_id has no FK: ActivityLog is a polymorphic log (entity_type tells
-- you which table entity_id refers to — Task, Project, Comment, ...).
-- MySQL cannot enforce a FK against more than one target table, so this
-- reference is intentionally unenforced; acceptable for an append-only log.
CREATE TABLE ActivityLog (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   INT UNSIGNED NOT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_activitylog_user (user_id),
  KEY idx_activitylog_entity (entity_type, entity_id),
  KEY idx_activitylog_timestamp (`timestamp`),
  CONSTRAINT fk_activitylog_user FOREIGN KEY (user_id) REFERENCES User(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Notification (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  type        ENUM('task_assigned','status_changed','deadline_approaching') NOT NULL,
  content     VARCHAR(255) NOT NULL,
  is_read     TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notification_user_read (user_id, is_read),
  CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES User(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- VIEWS
-- ---------------------------------------------------------------------

CREATE VIEW v_project_task_stats AS
SELECT
  p.id                              AS project_id,
  p.name                            AS project_name,
  SUM(t.status = 'To Do')           AS todo_count,
  SUM(t.status = 'In Progress')     AS in_progress_count,
  SUM(t.status = 'Review')          AS review_count,
  SUM(t.status = 'Done')            AS done_count,
  COUNT(t.id)                       AS total_count
FROM Project p
LEFT JOIN Task t ON t.project_id = p.id
GROUP BY p.id, p.name;

CREATE VIEW v_overdue_tasks AS
SELECT
  t.id                             AS task_id,
  t.title,
  t.project_id,
  p.name                           AS project_name,
  t.assignee_id,
  u.name                           AS assignee_name,
  t.due_date,
  DATEDIFF(CURDATE(), t.due_date)  AS days_overdue
FROM Task t
JOIN Project p ON p.id = t.project_id
LEFT JOIN User u ON u.id = t.assignee_id
WHERE t.due_date < CURDATE()
  AND t.status <> 'Done';

-- ---------------------------------------------------------------------
-- TRIGGERS
--
-- @current_user_id is a MySQL session variable the backend must set on
-- the same DB connection, right before the mutating query, e.g.:
--   SET @current_user_id = 42;
--   UPDATE Task SET status = 'Done' WHERE id = 7;
-- This lets the trigger record who actually performed the action rather
-- than just the task's assignee/reporter. If the app forgets to set it
-- (or a different pooled connection is used), COALESCE() below falls
-- back to reporter_id as a best-effort guess — a known limitation, not
-- a full solution. See project notes for the full trade-off discussion.
--
-- "Deadline approaching" notifications are intentionally NOT implemented
-- here: they require re-checking due_date against the current time on a
-- schedule, not a row-level INSERT/UPDATE event. That belongs in a cron
-- job / AWS EventBridge rule in a later phase.
-- ---------------------------------------------------------------------

DELIMITER $$

CREATE TRIGGER trg_task_after_insert
AFTER INSERT ON Task
FOR EACH ROW
BEGIN
  INSERT INTO ActivityLog (user_id, action, entity_type, entity_id, `timestamp`)
  VALUES (COALESCE(@current_user_id, NEW.reporter_id), 'task_created', 'Task', NEW.id, NOW());

  IF NEW.assignee_id IS NOT NULL THEN
    INSERT INTO Notification (user_id, type, content, is_read, created_at)
    VALUES (
      NEW.assignee_id,
      'task_assigned',
      CONCAT('You were assigned to task "', NEW.title, '"'),
      0,
      NOW()
    );
  END IF;
END$$

CREATE TRIGGER trg_task_after_update
AFTER UPDATE ON Task
FOR EACH ROW
BEGIN
  -- status changed (<=> is NULL-safe: handles NULL <-> value transitions correctly)
  IF NOT (OLD.status <=> NEW.status) THEN
    INSERT INTO ActivityLog (user_id, action, entity_type, entity_id, `timestamp`)
    VALUES (COALESCE(@current_user_id, NEW.reporter_id), 'task_status_changed', 'Task', NEW.id, NOW());

    IF NEW.assignee_id IS NOT NULL THEN
      INSERT INTO Notification (user_id, type, content, is_read, created_at)
      VALUES (
        NEW.assignee_id,
        'status_changed',
        CONCAT('Task "', NEW.title, '" status changed to ', NEW.status),
        0,
        NOW()
      );
    END IF;
  END IF;

  -- assignee changed
  IF NOT (OLD.assignee_id <=> NEW.assignee_id) THEN
    INSERT INTO ActivityLog (user_id, action, entity_type, entity_id, `timestamp`)
    VALUES (COALESCE(@current_user_id, NEW.reporter_id), 'task_assignee_changed', 'Task', NEW.id, NOW());

    IF NEW.assignee_id IS NOT NULL THEN
      INSERT INTO Notification (user_id, type, content, is_read, created_at)
      VALUES (
        NEW.assignee_id,
        'task_assigned',
        CONCAT('You were assigned to task "', NEW.title, '"'),
        0,
        NOW()
      );
    END IF;
  END IF;
END$$

DELIMITER ;
