import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/routes.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { sessionMiddleware } from './auth/session.js';
import { passport } from './auth/passport.js';
import authRoutes from './auth/auth.route.js';
import { requireUser, requireCsrf, authorizeApi } from './auth/auth.middleware.js';

const app = express();
const corsOrigin = (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(origin => origin.trim()).filter(Boolean);
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) throw new Error('Configura CORS_ORIGIN para el frontend.');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.send('Hello World!');
});

app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use('/api', sessionMiddleware, passport.initialize(), passport.session());
app.use('/api/auth', authRoutes);
app.use('/api', requireUser, requireCsrf, authorizeApi, routes);

app.use(errorMiddleware);
export default app;
