import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { session } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => session.get()?.user || null);
  const [ready, setReady] = useState(!session.get());

  // Validate any stored session once on start (silently refreshes an expired access token).
  useEffect(() => {
    if (!session.get()) return;
    api.get('/auth/me')
      .then(({ data }) => { const s = session.get(); if (s) { session.set({ ...s, user: data.user }); setUser(data.user); } })
      .catch(() => { if (!session.get()) setUser(null); })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('velora:logout', onLogout);
    return () => window.removeEventListener('velora:logout', onLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    session.set({ user: data.user, tokens: data.tokens });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const s = session.get();
    try { if (s?.tokens?.refresh_token) await api.post('/auth/logout', { refresh_token: s.tokens.refresh_token }); } catch { /* ignore */ }
    session.clear();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, ready, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
