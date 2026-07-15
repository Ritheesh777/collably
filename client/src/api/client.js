import axios from 'axios';

// In dev, Vite proxies /api -> :5050. For a Capacitor build, set VITE_API_URL
// to your deployed API origin (e.g. https://api.collably.com).
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

// 65s timeout tolerates a free-tier host cold start (which can take ~50s).
export const api = axios.create({ baseURL, timeout: 65000 });

// Renaming this logs every existing session out. Safe to do now (no real
// users yet); after launch a rename needs a migration or people get
// silently signed out.
export const TOKEN_KEY = 'collably_token';

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common.Authorization;
  }
}

// Bootstrap the header from storage on load
const existing = localStorage.getItem(TOKEN_KEY);
if (existing) api.defaults.headers.common.Authorization = `Bearer ${existing}`;

// Normalize errors to a friendly message
api.interceptors.response.use(
  (res) => {
    // Guard: if the API base isn't wired up, a same-origin SPA host can return
    // index.html (200) for /api/* — treat any HTML payload as a failed call so
    // callers' .catch runs instead of crashing on undefined JSON.
    const ct = res.headers?.['content-type'] || '';
    if (typeof res.data === 'string' && (ct.includes('text/html') || res.data.trimStart().startsWith('<'))) {
      return Promise.reject({ message: 'API is not reachable', status: 0 });
    }
    return res;
  },
  async (error) => {
    const config = error.config || {};
    const method = (config.method || 'get').toLowerCase();
    const status = error.response?.status;
    // Retry idempotent GETs through a host cold start: network error, timeout,
    // or a gateway status. Spaced delays cover the ~50s a free host takes to wake.
    const retryable =
      !error.response || error.code === 'ECONNABORTED' || [502, 503, 504].includes(status);
    if (method === 'get' && retryable) {
      config.__retry = (config.__retry || 0) + 1;
      if (config.__retry <= 5) {
        await new Promise((r) => setTimeout(r, 3000 * config.__retry)); // 3,6,9,12,15s
        return api(config);
      }
    }

    const message =
      error.response?.data?.message || error.message || 'Something went wrong. Please try again.';
    const details = error.response?.data?.details;
    if (status === 401 && !config.url?.includes('/auth/')) {
      setAuthToken(null);
    }
    return Promise.reject({ message, details, status });
  }
);

export const API_ORIGIN = import.meta.env.VITE_API_URL || '';
