import axiosClient from './axiosClient';

// Every backend response follows { success, data, error } (see
// backend/src/utils/apiResponse.js and middleware/errorHandler.js), so each
// wrapper here unwraps `data` and lets the caller catch on `error.response`.
export async function login(email, password) {
  const res = await axiosClient.post('/auth/login', { email, password });
  return res.data.data; // { user, token }
}

export async function register(name, email, password) {
  const res = await axiosClient.post('/auth/register', { name, email, password });
  return res.data.data; // { user, token }
}

export async function getMe() {
  const res = await axiosClient.get('/auth/me');
  return res.data.data.user;
}

export async function updateProfile(fields) {
  const res = await axiosClient.put('/auth/profile', fields);
  return res.data.data.user;
}
