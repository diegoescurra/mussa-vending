import express from 'express';
import type { Router } from 'express';
import { errorMiddleware } from '../middlewares/error.middleware.js';

// Pruebas aisladas de controladores. La autenticación real se prueba con PostgreSQL y navegador.
export const createTestApp = (router: Router, identity: Partial<Express.User> = {}) => {
  const app = express();

  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id_usuario: 99, nombre: 'Test', apellido: 'Admin', email: 'test@example.invalid', rol: 'ADMIN', estado: true, fecha_creacion: new Date(), auth_version: 1, ...identity };
    next();
  });
  app.use('/api', router);
  app.use(errorMiddleware);

  return app;
};
