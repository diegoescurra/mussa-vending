import test from 'node:test';
import assert from 'node:assert/strict';
import { axisDates, calendarDay, dailySegments, moneyDomain, rankProviders, scale } from './graphHelpers.ts';

test('money scales include zero and support empty, zero, negative and mixed values', () => {
  assert.deepEqual(moneyDomain([]), [0, 1]);
  assert.deepEqual(moneyDomain([0, 0]), [0, 1]);
  assert.deepEqual(moneyDomain([-200]), [-200, 0]);
  assert.deepEqual(moneyDomain([150]), [0, 150]);
  assert.deepEqual(moneyDomain([-100, 300]), [-100, 300]);
  assert.equal(scale(0, [-100, 300], [0, 400]), 100);
  assert.equal(scale(-100, [-100, 300], [0, 400]), 0);
  assert.equal(scale(300, [-100, 300], [0, 400]), 400);
  assert.equal(scale(0, [0, 0], [10, 90]), 50);
});

test('daily series sort without mutating, retain visited zero days and break missing days', () => {
  const row = (fecha, visitas = 1) => ({ fecha, visitas, dinero_retirado: 0, venta_estimada: 0 });
  const input = [row('2026-10-05'), row('2026-10-02'), row('2026-10-03', 0), row('2026-10-01')];
  const { days, segments } = dailySegments(input);
  assert.deepEqual(days.map((day) => day.fecha), ['2026-10-01', '2026-10-02', '2026-10-05']);
  assert.deepEqual(segments.map((segment) => segment.length), [2, 1]);
  assert.equal(input[0].fecha, '2026-10-05');
  assert.deepEqual(dailySegments([]), { days: [], segments: [] });
  assert.equal(dailySegments([row('2026-10-01')]).segments.length, 1);
});

test('calendar spacing is independent of DST, month boundaries and local time zone', () => {
  assert.equal(calendarDay('2026-09-06') - calendarDay('2026-09-05'), 1);
  assert.equal(calendarDay('2026-10-01') - calendarDay('2026-09-30'), 1);
  assert.equal(calendarDay('2024-03-01') - calendarDay('2024-02-28'), 2);
});

test('unlimited period keeps every observed day but bounds visible axis labels', () => {
  const dates = Array.from({ length: 1000 }, (_, index) => new Date(Date.UTC(2020, 0, index + 1)).toISOString().slice(0, 10));
  const rows = dates.map((fecha) => ({ fecha, visitas: 1, dinero_retirado: 10, venta_estimada: 20 }));
  assert.equal(dailySegments(rows).days.length, 1000);
  assert.equal(axisDates(dates).length, 5);
  assert.equal(axisDates(dates)[0], dates[0]);
  assert.equal(axisDates(dates).at(-1), dates.at(-1));
  assert.deepEqual(axisDates([]), []);
  assert.deepEqual(axisDates(['2026-10-01']), ['2026-10-01']);
});

test('provider ranking highlights large negative margins and does not drop all-table data', () => {
  const rows = [
    { nombre: 'B', margen_estimado: 0 },
    { nombre: 'C', margen_estimado: 100 },
    { nombre: 'A', margen_estimado: -200 },
  ];
  assert.deepEqual(rankProviders(rows).map((row) => row.nombre), ['A', 'C', 'B']);
  assert.equal(rows[0].nombre, 'B');
  assert.deepEqual(rankProviders([]), []);
  assert.equal(rankProviders([rows[0]]).length, 1);
  const many = Array.from({ length: 12 }, (_, index) => ({ nombre: `Proveedor ${index}`, margen_estimado: index }));
  assert.equal(rankProviders(many).slice(0, 8).length, 8);
  assert.equal(rankProviders(many).length, 12);
});

test('date labels use temporal spacing rather than row spacing across long gaps', () => {
  const dates = ['2020-01-01', '2020-01-02', '2020-01-03', '2020-01-04', '2020-01-05', '2026-10-01'];
  assert.deepEqual(axisDates(dates), ['2020-01-01', '2026-10-01']);
  assert.deepEqual(axisDates(dates.slice(0, 2)), dates.slice(0, 2));
});
