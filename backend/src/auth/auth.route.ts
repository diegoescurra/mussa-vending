import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { getSession, login, logout, updatePassword } from './auth.controller.js';
import { requireCsrf, requireUser } from './auth.middleware.js';

const router = Router();
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { status: 'fail', message: 'Demasiados intentos. Espera 15 minutos antes de volver a intentar.' },
});
router.get('/session', getSession);
router.post('/login', requireCsrf, loginLimit, login);
router.post('/logout', requireCsrf, logout);
router.post('/password', requireUser, requireCsrf, loginLimit, updatePassword);
export default router;
