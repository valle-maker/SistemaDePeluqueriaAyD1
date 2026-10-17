// Low-level client for the BarberBook backend. Every network call in the app goes through `api()`.
//
// VITE_API_BASE_URL is the backend address, with or without the trailing "/api/v1"
// (e.g. https://barberbook-backend-xxxx.onrender.com). Locally it defaults to http://localhost:8080.
import { clearSession, getToken } from './session';

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8080';
export const API_BASE_URL = RAW_BASE.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
const API_PREFIX = `${API_BASE_URL}/api/v1`;

// Fired when the backend rejects the stored token (expired, revoked, account disabled), so the
// app can send the user back to the login screen from anywhere.
export const UNAUTHORIZED_EVENT = 'bb:unauthorized';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(status: number, message: string, code?: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  // false for public endpoints, so a stale token never turns a public request into a 401.
  auth?: boolean;
}

const NETWORK_MESSAGE =
  'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo en unos segundos.';

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true } = options;

  const url = new URL(`${API_PREFIX}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, NETWORK_MESSAGE);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }
  }

  if (!response.ok) {
    const err = (data ?? {}) as { message?: string; code?: string; fieldErrors?: Record<string, string> };
    // A 401 on a request that carried a token means the session is no longer valid.
    if (response.status === 401 && token) {
      clearSession();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(
      response.status,
      err.message ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.',
      err.code ?? undefined,
      err.fieldErrors ?? undefined,
    );
  }

  return data as T;
}
