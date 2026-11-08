import { api } from './api';
import type { Usuario } from './usuarios.service';
export type Session = { user: Usuario | null; csrfToken: string };
export const authService = {
  session: () => api.get<Session>('/auth/session'),
  login: (credentials: { email: string; password: string }) => api.post<Session>('/auth/login', credentials),
  logout: () => api.post<void>('/auth/logout', {}),
  changePassword: (payload: { currentPassword: string; password: string }) =>
    api.post<void>('/auth/password', payload),
};
