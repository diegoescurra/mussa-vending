import { asyncHandler } from '../utils/AsyncHandler.js';
import { getDashboard } from './dashboard.service.js';

export const getDashboardController = asyncHandler(async (req, res) => {
  const data = await getDashboard(req.query.desde, req.query.hasta);
  res.json({ status: 'success', data });
});
