import { AppError } from './AppError.js';

const MAX_HISTORY_ID = 2147483647;
export const HISTORY_PAGE_SIZE = 50;

export const parseHistoryMaxId = (before: unknown): number => {
  if (before === undefined) return MAX_HISTORY_ID;

  const id = typeof before === 'string' && /^\d+$/.test(before) ? Number(before) : NaN;
  if (!Number.isInteger(id) || id < 1 || id > MAX_HISTORY_ID) {
    throw new AppError('antes_de debe ser un identificador entero positivo válido', 400);
  }

  // Convert the exclusive cursor to an inclusive bound on the indexed ID.
  return id - 1;
};

export const historyPage = <T>(rows: T[], getId: (row: T) => number) => {
  const items = rows.slice(0, HISTORY_PAGE_SIZE);
  const last = items.at(-1);
  return {
    items,
    nextCursor: rows.length > HISTORY_PAGE_SIZE && last ? getId(last) : null,
  };
};
