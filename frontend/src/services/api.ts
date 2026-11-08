const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
let csrfToken: string | undefined;
let sessionRequest: Promise<void> | undefined;

async function ensureCsrf() {
  if (csrfToken) return;
  sessionRequest ??= request<{ csrfToken: string }>('/auth/session')
    .then(() => {})
    .finally(() => {
      sessionRequest = undefined;
    });
  await sessionRequest;
}

export type HistoryPage<T> = {
  items: T[];
  nextCursor: number | null;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ApiResponse<T> = {
  status: 'success' | 'fail' | 'error';
  message?: string;
  data?: T;
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const writes = options.method && !['GET', 'HEAD'].includes(options.method);
  if (writes) await ensureCsrf();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(writes ? { 'X-CSRF-Token': csrfToken! } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) {
    if (path === '/auth/logout' || path === '/auth/password') csrfToken = undefined;
    return undefined as T;
  }

  let payload: ApiResponse<T> | null;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (response.status === 403) csrfToken = undefined;
    if (response.status === 401 && path !== '/auth/login') {
      csrfToken = undefined;
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw new ApiError(payload?.message ?? `Error en la solicitud: ${response.status}`, response.status);
  }

  if (path === '/auth/session' || path === '/auth/login') {
    csrfToken = (payload?.data as { csrfToken?: string } | undefined)?.csrfToken;
  }

  return payload?.data as T;
};

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T, B = unknown>(path: string, body: B) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T, B = unknown>(path: string, body: B) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T = void>(path: string) =>
    request<T>(path, {
      method: 'DELETE',
    }),
};
