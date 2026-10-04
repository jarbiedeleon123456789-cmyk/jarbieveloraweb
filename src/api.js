import axios from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const KEY = 'velora_session';

export const session = {
  get() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
  },
  set(value) { localStorage.setItem(KEY, JSON.stringify(value)); },
  clear() { localStorage.removeItem(KEY); },
};

const api = axios.create({ baseURL: API_URL + '/api', timeout: 30000 });

api.interceptors.request.use((config) => {
  const s = session.get();
  if (s?.tokens?.access_token) config.headers.Authorization = `Bearer ${s.tokens.access_token}`;
  return config;
});

// One in-flight refresh shared by all failing requests.
let refreshing = null;
async function refreshTokens() {
  const s = session.get();
  if (!s?.tokens?.refresh_token) throw new Error('No refresh token');
  const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refresh_token: s.tokens.refresh_token });
  session.set({ ...s, tokens: data.tokens });
  return data.tokens.access_token;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    // Never try to refresh for the credential endpoints themselves (/auth/me IS refreshable).
    const isAuthCall = /\/auth\/(login|register|refresh|logout)/.test(original?.url || '');
    if (status === 401 && original && !original._retry && !isAuthCall && session.get()) {
      original._retry = true;
      try {
        refreshing = refreshing || refreshTokens().finally(() => { refreshing = null; });
        const token = await refreshing;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        session.clear();
        window.dispatchEvent(new Event('velora:logout'));
      }
    }
    return Promise.reject(error);
  }
);

/** Human-friendly message from an API error. */
export function errorMessage(err) {
  if (err.response?.data?.error) return err.response.data.error;
  if (err.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (err.message === 'Network Error') return 'Cannot reach the server. Check your connection or the API URL.';
  return err.message || 'Something went wrong';
}

export default api;
