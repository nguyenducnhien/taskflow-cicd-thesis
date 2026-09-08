import axiosClient from './axiosClient';

// See backend/src/modules/dashboard/dashboard.controller.js for the exact
// contract. Both endpoints scope results the same way listProjects() does:
// Admin sees every project, a Member only sees projects they belong to.

export async function getSummary() {
  const res = await axiosClient.get('/dashboard/summary');
  return res.data.data; // { totals, status_breakdown, by_project }
}

export async function listOverdueTasks() {
  const res = await axiosClient.get('/dashboard/overdue-tasks');
  return res.data.data.overdue_tasks;
}
