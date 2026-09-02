-- =====================================================================
-- Task Management System — Seed Data
-- Run AFTER schema.sql.
-- =====================================================================

USE task_manager_db;

-- =====================================================================
-- TEST ACCOUNTS FOR PLAYWRIGHT AUTOMATED LOGIN TESTS
-- ---------------------------------------------------------------------
-- All three accounts below share the same plaintext password:
--
--       Test@1234
--
-- | Role   | Email                   | Password   |
-- |--------|-------------------------|------------|
-- | Admin  | admin@taskflow.local    | Test@1234  |
-- | Member | member1@taskflow.local  | Test@1234  |
-- | Member | member2@taskflow.local  | Test@1234  |
--
-- The password_hash values inserted below are REAL BCrypt hashes (cost
-- factor 10) of "Test@1234" — generated with bcryptjs and verified with
-- bcrypt.compareSync() before being written here — so your backend's
-- login route (bcrypt.compare(plaintext, hash)) will actually succeed
-- against this data. Keep this table of credentials in your Playwright
-- test fixtures/config; plaintext passwords are only ever written down
-- here because this is throwaway seed/test data, never do this for
-- real accounts.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------
INSERT INTO Role (id, name, permissions) VALUES
  (1, 'Admin',  NULL),
  (2, 'Member', NULL);

-- ---------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------
INSERT INTO User (id, name, email, password_hash, avatar, role_id, status) VALUES
  (1, 'System Admin',  'admin@taskflow.local',   '$2b$10$p8aOOeBq6WmQBu2kC.544.sonaOoNaZJbL8LWHMYLWMY4rNh4LToa', NULL, 1, 'active'),
  (2, 'Nguyen Van A',  'member1@taskflow.local', '$2b$10$LRVLFE.UUlK5nAULVlX.hOO9GsbcUoGn1FzmRIHm.nRVS7HM6J88O', NULL, 2, 'active'),
  (3, 'Tran Thi B',    'member2@taskflow.local', '$2b$10$11nw22IurPCxYNvaFr972u19KpKauY9bISsMi6Ohu9H8VVQWTAO1O', NULL, 2, 'active');

-- ---------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------
INSERT INTO Project (id, name, description, start_date, end_date, status, owner_id) VALUES
  (1, 'Website Redesign', 'Revamp the marketing site UI and content.', '2026-08-01', '2026-10-01', 'active', 2),
  (2, 'Mobile App MVP',   'First shippable version of the mobile app.', '2026-08-10', '2026-11-01', 'active', 1);

-- ---------------------------------------------------------------------
-- Project Members
-- ---------------------------------------------------------------------
INSERT INTO ProjectMember (project_id, user_id) VALUES
  (1, 2), (1, 3),         -- Website Redesign: member1, member2
  (2, 1), (2, 2), (2, 3); -- Mobile App MVP: admin, member1, member2

-- ---------------------------------------------------------------------
-- Labels
-- ---------------------------------------------------------------------
INSERT INTO Label (id, name, color) VALUES
  (1, 'Bug',     '#E53935'),
  (2, 'Feature', '#1E88E5'),
  (3, 'Improvement', '#43A047');

-- ---------------------------------------------------------------------
-- Tasks
-- Covers all 4 statuses, an unassigned task, and two tasks whose
-- due_date is already in the past with status <> 'Done' — those two
-- are what v_overdue_tasks should return when queried today.
--
-- Note: trg_task_after_insert fires for every row below, so ActivityLog
-- and Notification will already contain rows after this script runs.
-- @current_user_id is not set during seeding, so those log rows fall
-- back to reporter_id (see schema.sql trigger comments) — expected here.
-- ---------------------------------------------------------------------
INSERT INTO Task (id, project_id, title, description, priority, assignee_id, reporter_id, status, due_date) VALUES
  (1, 1, 'Setup project repository',   'Initialize repo, branch strategy, README.', 'medium', 2, 2, 'Done',        '2026-08-01'),
  (2, 1, 'Design homepage mockup',     'Low-fi wireframe for the new homepage.',    'medium', 3, 2, 'In Progress', '2026-09-05'),
  (3, 1, 'Implement login page',       'Login form wired to /api/auth/login.',      'high',   3, 2, 'To Do',       '2026-09-10'),
  (4, 1, 'Fix responsive layout bug',  'Nav bar breaks below 768px width.',         'high',   2, 3, 'Review',      '2026-08-20'),

  (5, 2, 'Define API endpoints',       'Draft REST routes for tasks/projects.',     'medium', 1, 1, 'Done',        '2026-08-10'),
  (6, 2, 'Setup CI/CD pipeline',       'Jenkins pipeline: build, test, deploy.',    'high',   2, 1, 'In Progress', '2026-09-15'),
  (7, 2, 'Create wireframes',          'Screen flow for MVP.',                      'medium', 3, 1, 'To Do',       '2026-08-22'),
  (8, 2, 'Integrate push notifications','Not started, unassigned.',                 'low',    NULL, 1, 'To Do',    '2026-09-30');

-- ---------------------------------------------------------------------
-- Task Labels
-- ---------------------------------------------------------------------
INSERT INTO TaskLabel (task_id, label_id) VALUES
  (4, 1), -- Fix responsive layout bug -> Bug
  (2, 2), -- Design homepage mockup -> Feature
  (6, 2), -- Setup CI/CD pipeline -> Feature
  (7, 3); -- Create wireframes -> Improvement
