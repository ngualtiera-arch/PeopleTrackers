export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// The access token cookie is short-lived (15 min, apps/api/src/routes/auth.routes.ts) so a
// staff member working through a normal day would otherwise get silently logged out mid-task —
// even though the 30-day refresh token cookie sitting right there is still perfectly valid. On a
// 401, try one silent refresh and replay the original request before giving up. Concurrent 401s
// (several queries expiring around the same moment) share one in-flight refresh instead of each
// firing their own.
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function doFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include', // send the httpOnly session cookies
    headers: {
      // Only when there's a JSON body — Fastify's JSON body parser rejects an empty body as
      // invalid JSON, so a bodyless DELETE with this header unconditionally set 400s. A FormData
      // body (file upload) must NOT get this header — the browser sets its own multipart
      // Content-Type with the boundary, and overriding it here corrupts the upload.
      ...(init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
}

const AUTH_ENDPOINTS = ['/auth/login', '/auth/refresh', '/auth/logout'];

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await doFetch(path, init);

  if (res.status === 401 && !AUTH_ENDPOINTS.includes(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await doFetch(path, init);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, body.message ?? 'Request failed');
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
