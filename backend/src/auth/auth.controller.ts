import type { RequestHandler } from 'express';
import { passport } from './passport.js';
import { csrfToken } from './auth.middleware.js';
import { publicUser, changePassword } from './auth.service.js';
import { validatePassword } from './password.js';
import { cookieName, cookieOptions } from './session.js';
import { AppError } from '../utils/AppError.js';

export const getSession: RequestHandler = (req, res) => {
  res.json({
    status: 'success',
    data: { user: req.user ? publicUser(req.user) : null, csrfToken: csrfToken(req) },
  });
};
export const login: RequestHandler = (req, res, next) => {
  const { email, password } = req.body ?? {};
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    typeof password !== 'string' ||
    !password.length ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    throw new AppError('Correo o contraseña incorrectos.', 401);
  }
  passport.authenticate('local', (error: Error | null, user: Express.User | false) => {
    if (error) return next(error);
    if (!user) return next(new AppError('Correo o contraseña incorrectos.', 401));
    // Passport regenera el identificador para evitar fijación de sesión.
    req.logIn(user, (loginError) => {
      if (loginError) return next(loginError);
      const token = csrfToken(req);
      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        res.json({ status: 'success', data: { user: publicUser(user), csrfToken: token } });
      });
    });
  })(req, res, next);
};
export const logout: RequestHandler = (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie(cookieName, cookieOptions);
    res.status(204).send();
  });
};
export const updatePassword: RequestHandler = async (req, res, next) => {
  const { currentPassword, password } = req.body ?? {};
  if (typeof currentPassword !== 'string' || Buffer.byteLength(currentPassword, 'utf8') > 72) {
    throw new AppError('Ingresa tu contraseña actual.', 400);
  }
  validatePassword(password);
  await changePassword(req.user!, currentPassword, password);
  logout(req, res, next);
};
