import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ADMIN_TOKEN_COOKIE } from './cookies';

const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api/v1';

export function createServerApi(reqHeaders?: Headers | Record<string, string>): AxiosInstance {
  const instance = axios.create({ baseURL: apiBase, withCredentials: true });

  instance.interceptors.request.use((config) => {
    if (reqHeaders) {
      const cookieHeader = reqHeaders instanceof Headers
        ? reqHeaders.get('cookie')
        : (reqHeaders['cookie'] || reqHeaders['Cookie']);
      if (cookieHeader) {
        const token = parseCookie(cookieHeader)[ADMIN_TOKEN_COOKIE];
        if (token) {
          config.headers = config.headers || {};
          (config.headers as any)['Authorization'] = `Bearer ${token}`;
        }
      }
    }
    return config;
  });

  return instance;
}

export function createClientApi(getToken?: () => string | null): AxiosInstance {
  const instance = axios.create({ baseURL: apiBase, withCredentials: true });
  instance.interceptors.request.use((config) => {
    const token = getToken?.();
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any)['Authorization'] = `Bearer ${token}`;
    }
    return config;
  });
  return instance;
}

function parseCookie(cookie: string): Record<string, string> {
  return cookie.split(';').reduce((acc, part) => {
    const [k, ...v] = part.trim().split('=');
    acc[k] = decodeURIComponent(v.join('='));
    return acc;
  }, {} as Record<string, string>);
}

export async function serverGet<T>(path: string, reqHeaders?: Headers | Record<string, string>, config?: AxiosRequestConfig): Promise<T> {
  const api = createServerApi(reqHeaders);
  const res = await api.get(path, config);
  return res.data;
}


