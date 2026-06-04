const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

type ApiResponse<T> = {
  status: 'success' | 'fail' | 'error';
  message?: string;
  data?: T;
};

type RequestBody = Record<string, unknown>;

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(payload.message ?? 'Error en la solicitud');
  }

  return payload.data as T;
};

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body: RequestBody) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(path: string, body: RequestBody) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string) =>
    request<T>(path, {
      method: 'DELETE',
    }),
};
