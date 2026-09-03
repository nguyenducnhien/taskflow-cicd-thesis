import axiosClient from './axiosClient';

// See backend/src/modules/projects/project.routes.js + project.controller.js
// for the exact contract each of these calls against.

// MySQL DATE columns come back from mysql2 as full ISO datetime strings
// (e.g. "2026-07-31T17:00:00.000Z") rather than plain "YYYY-MM-DD", so any
// <input type="date"> or plain-text display needs the date part sliced off
// first, or the input silently renders blank.
export function toDateInputValue(isoString) {
  return isoString ? isoString.slice(0, 10) : '';
}

export async function listProjects() {
  const res = await axiosClient.get('/projects');
  return res.data.data.projects;
}

export async function getProject(id) {
  const res = await axiosClient.get(`/projects/${id}`);
  return res.data.data.project;
}

export async function createProject(fields) {
  const res = await axiosClient.post('/projects', fields);
  return res.data.data.project;
}

export async function updateProject(id, fields) {
  const res = await axiosClient.put(`/projects/${id}`, fields);
  return res.data.data.project;
}

export async function deleteProject(id) {
  await axiosClient.delete(`/projects/${id}`);
}

export async function listMembers(id) {
  const res = await axiosClient.get(`/projects/${id}/members`);
  return res.data.data.members;
}

export async function addMember(id, userId) {
  await axiosClient.post(`/projects/${id}/members`, { user_id: userId });
}

export async function removeMember(id, userId) {
  await axiosClient.delete(`/projects/${id}/members/${userId}`);
}
