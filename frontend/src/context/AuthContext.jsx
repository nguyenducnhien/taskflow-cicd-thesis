import { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/auth.api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // loading = "still checking whether a saved token is valid". The app
  // must not decide to show /login vs. the real page until this settles,
  // otherwise a refresh on a protected page would flash the login screen.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .getMe()
      .then((freshUser) => {
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
      })
      .catch(() => {
        // axiosClient's 401 interceptor already clears storage on an
        // expired/invalid token; nothing extra to do here.
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { user: loggedInUser, token } = await authApi.login(email, password);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function register(name, email, password) {
    const { user: newUser, token } = await authApi.register(name, email, password);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
    return newUser;
  }

  function logout() {
    // JWT auth is stateless server-side (see backend auth.controller.js
    // logout()) — there is no server session to end, so logging out is
    // purely a client-side action: forget the token.
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  // Called after a successful PUT /auth/profile so the navbar and any other
  // consumer of useAuth().user reflect the change immediately, without a
  // full page reload or a redundant GET /auth/me.
  function updateUser(updatedUser) {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
