import { AppError } from './AppError.js';

export const isNonNegativeInt32 = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 2147483647;

export const isPositiveInt32 = (value: unknown): value is number =>
  isNonNegativeInt32(value) && value > 0;

export const parsePositiveInt32 = (value: unknown, message: string): number => {
  const id = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!isPositiveInt32(id)) throw new AppError(message, 400);
  return id;
};
