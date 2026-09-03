import axios from 'axios';

// Every backend route except /auth/register and /auth/login sits behind the
// `protect` middleware (Authorization: Bearer <token>), so the token is
// attached here once instead of at every call site.
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// The backend's JWT expiry (JWT_EXPIRES_IN, default 1d) means a token can
// go stale mid-session. A 401 here means "not authenticated" regardless of
// which page triggered it, so we clear the stale session and bounce to
// /login from one place rather than checking this in every page.
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
