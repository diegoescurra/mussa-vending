import type { RequestHandler } from 'express';
import { AppError } from '../utils/AppError.js';
import { getDashboard } from './dashboard.service.js';

const isCalendarDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const getDashboardController: RequestHandler = async (req, res) => {
  const { desde, hasta } = req.query;
  if (!isCalendarDate(desde) || !isCalendarDate(hasta)) {
    throw new AppError('Desde y hasta deben ser fechas reales con formato YYYY-MM-DD', 400);
  }
  const data = await getDashboard(desde, hasta);
  res.json({ status: 'success', data });
};
