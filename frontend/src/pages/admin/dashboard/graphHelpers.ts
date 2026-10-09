import type { Dashboard } from '../../../services/dashboard.service';

export const calendarDay = (date: string) => Date.parse(`${date.slice(0, 10)}T12:00:00Z`) / 86_400_000;

export function moneyDomain(values: number[]): [number, number] {
  let min = 0;
  let max = 0;
  for (const value of values) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return min === max ? [0, 1] : [min, max];
}

export const scale = (value: number, domain: [number, number], range: [number, number]) =>
  domain[0] === domain[1] ? (range[0] + range[1]) / 2 :
    range[0] + (value - domain[0]) / (domain[1] - domain[0]) * (range[1] - range[0]);

export function dailySegments(rows: Dashboard['evolucion']) {
  const days = rows.filter((row) => row.visitas > 0).sort((a, b) => calendarDay(a.fecha) - calendarDay(b.fecha));
  const segments: Dashboard['evolucion'][] = [];
  for (const day of days) {
    const previous = segments.at(-1)?.at(-1);
    // Do not connect across days without visits: no observation is not a zero.
    if (!previous || calendarDay(day.fecha) - calendarDay(previous.fecha) !== 1) segments.push([]);
    segments[segments.length - 1].push(day);
  }
  return { days, segments };
}

export const rankProviders = (rows: Dashboard['proveedores']['detalle']) => [...rows].sort((a, b) =>
  Math.abs(b.margen_estimado) - Math.abs(a.margen_estimado) || a.nombre.localeCompare(b.nombre, 'es'));

export const axisDates = (dates: string[]) => {
  if (dates.length <= 1) return dates;
  const first = calendarDay(dates[0]);
  const last = calendarDay(dates[dates.length - 1]);
  const gap = (last - first) / 5;
  const labels = [dates[0]];
  for (const date of dates.slice(1, -1)) {
    const day = calendarDay(date);
    if (labels.length < 4 && day - calendarDay(labels[labels.length - 1]) >= gap && last - day >= gap) labels.push(date);
  }
  labels.push(dates[dates.length - 1]);
  return labels;
};
