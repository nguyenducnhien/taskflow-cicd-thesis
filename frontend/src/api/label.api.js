import axiosClient from './axiosClient';

// Reading the label list is open to any authenticated user (needed for the
// label picker on a task); creating/editing/deleting labels is Admin-only
// (see backend/src/modules/labels/label.routes.js) and isn't exposed here
// since this thesis's frontend scope doesn't include a label-admin screen.
export async function listLabels() {
  const res = await axiosClient.get('/labels');
  return res.data.data.labels;
}
