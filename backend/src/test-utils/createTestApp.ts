import express from 'express';
import type { Router } from 'express';
import { errorMiddleware } from '../middlewares/error.middleware.js';

export const createTestApp = (router: Router) => {
  const app = express();

  app.use(express.json());
  app.use('/api', router);
  app.use(errorMiddleware);

  return app;
};
