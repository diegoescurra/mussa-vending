export const panelClass = 'min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';
export const cellClass = 'border-b border-slate-100 px-4 py-4 text-slate-700';
export const headingClass = 'whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold';
export const linkClass = 'font-semibold text-blue-700 underline decoration-blue-200 underline-offset-4 hover:decoration-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600';
export const disclosureClass = 'cursor-pointer rounded-lg text-sm font-semibold text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600';

const timeZone = 'America/Santiago';
const dateFormatter = new Intl.DateTimeFormat('es-CL', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('es-CL', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const formatDate = (value: string) => {
  // Calendar dates must not shift to the previous day in Santiago.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T12:00:00Z` : value);
  return dateOnly ? dateFormatter.format(date) : dateTimeFormatter.format(date);
};
