import { Router } from 'express';
import { getDashboardController } from './dashboard.controller.js';

const router = Router();

router.get('/dashboard', getDashboardController);

export default router;
