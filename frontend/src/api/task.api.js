import axiosClient from './axiosClient';

// task.routes.js (project-scoped create/list) + taskItem.routes.js
// (everything keyed by the task's own global id) — see backend for the
// exact contract each call here matches.

export async function listTasks(projectId, filters = {}) {
  const res = await axiosClient.get(`/projects/${projectId}/tasks`, { params: filters });
  return res.data.data.tasks;
}

export async function createTask(projectId, fields) {
  const res = await axiosClient.post(`/projects/${projectId}/tasks`, fields);
  return res.data.data.task;
}

export async function getTask(id) {
  const res = await axiosClient.get(`/tasks/${id}`);
  return res.data.data.task;
}

export async function updateTask(id, fields) {
  const res = await axiosClient.put(`/tasks/${id}`, fields);
  return res.data.data.task;
}

export async function updateTaskStatus(id, status) {
  const res = await axiosClient.patch(`/tasks/${id}/status`, { status });
  return res.data.data.task;
}

export async function deleteTask(id) {
  await axiosClient.delete(`/tasks/${id}`);
}

export async function addLabel(taskId, labelId) {
  const res = await axiosClient.post(`/tasks/${taskId}/labels`, { label_id: labelId });
  return res.data.data.labels;
}

export async function removeLabel(taskId, labelId) {
  const res = await axiosClient.delete(`/tasks/${taskId}/labels/${labelId}`);
  return res.data.data.labels;
}

export async function listComments(taskId) {
  const res = await axiosClient.get(`/tasks/${taskId}/comments`);
  return res.data.data.comments;
}

export async function createComment(taskId, content) {
  const res = await axiosClient.post(`/tasks/${taskId}/comments`, { content });
  return res.data.data.comment;
}
