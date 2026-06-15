import axios from 'axios';

/** Strip accidental quotes/whitespace from .env values (common deploy mistake). */
function sanitizeApiUrl(raw: string | undefined, fallback: string): string {
  if (!raw || typeof raw !== 'string') return fallback;
  let url = raw.trim().replace(/^['"]+|['"]+$/g, '');
  // Fix doubled protocol from bad copy-paste: "https://pos.sownmark.com/api"
  if (url.includes('https://') && url.indexOf('https://') > 0) {
    url = url.slice(url.indexOf('https://'));
  }
  if (url.includes('http://') && url.indexOf('http://') > 0) {
    url = url.slice(url.indexOf('http://'));
  }
  return url.replace(/\/$/, '') || fallback;
}

const DEFAULT_API = 'http://localhost:7000/api';

export const API_BASE_URL = sanitizeApiUrl(import.meta.env.VITE_API_URL, DEFAULT_API);
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
export const SOCKET_ORIGIN = API_ORIGIN;

/** Default params for list endpoints — fetch all items for POS/menus */
export const LIST_ALL_PARAMS = { limit: 500, page: 1 };

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
