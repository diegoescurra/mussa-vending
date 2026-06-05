const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

type ApiResponse<T> = {
  status: "success" | "fail" | "error";
  message?: string;
  data?: T;
};

const request = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: ApiResponse<T> | null = null;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(
      payload?.message ?? `Error en la solicitud: ${response.status}`
    );
  }

  return payload?.data as T;
};

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T, B = unknown>(path: string, body: B) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: <T, B = unknown>(path: string, body: B) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  patch: <T, B = unknown>(path: string, body: B) =>
    request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: <T = void>(path: string) =>
    request<T>(path, {
      method: "DELETE",
    }),
};