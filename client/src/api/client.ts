import axios from 'axios';
import { store } from '../store';
import { setCredentials, logout } from '../store/slices/authSlice';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
  failedQueue = [];
};

/* A 401 from /auth/refresh means the session is simply gone; letting it
 * re-enter the refresh path would loop forever. */
const isRefreshRequest = (url?: string) => (url || '').includes('/auth/refresh');

/* Only bounce to /login when actually inside the authenticated app, and at
 * most once per 2000 ms — otherwise a stale cookie reload-loops /login and
 * guests get bounced off the landing page. */
let lastAuthRedirect = 0;
const redirectToLogin = () => {
  if (!window.location.pathname.startsWith('/app')) return;
  const now = Date.now();
  if (now - lastAuthRedirect < 2000) return;
  lastAuthRedirect = now;
  window.location.href = '/login';
};

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !isRefreshRequest(original?.url)) {
      if (isRefreshing) return new Promise((res, rej) => { failedQueue.push({ resolve: res, reject: rej }); }).then(t => { original.headers.Authorization = `Bearer ${t}`; return api(original); });
      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const token = data.data.accessToken;
        store.dispatch(setCredentials({ accessToken: token }));
        processQueue(null, token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (e) {
        processQueue(e, null);
        store.dispatch(logout());
        redirectToLogin();
        return Promise.reject(e);
      } finally { isRefreshing = false; }
    }
    return Promise.reject(error);
  }
);

export default api;
