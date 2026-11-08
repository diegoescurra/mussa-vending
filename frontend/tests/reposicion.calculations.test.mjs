import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildReposicionPayload,
  calculateLines,
  calculateResumen,
} from '../src/pages/reposicion/reposicion.calculations.ts';

const slot = Object.freeze({
  id_maquina_producto: 1, version: 7, id_producto: 4, producto_nombre: 'Snack',
  stock_actual: 10, capacidad_maxima: 20, precio_venta_actual: '1200.00',
});

test('withdrawals reduce final stock without increasing estimated sales', () => {
  const second = { ...slot, id_maquina_producto: 2 };
  const resumen = calculateResumen([slot, second], {
    1: { stockEncontrado: '6', cantidadRepuesta: '4', cantidadRetirada: '2' },
    2: { stockEncontrado: '10', cantidadRepuesta: '0', cantidadRetirada: '2' },
  }, '5000');

  assert.deepEqual(resumen.detalles.map(({ cantidadVendida, stockFinal }) => ({ cantidadVendida, stockFinal })), [
    { cantidadVendida: 4, stockFinal: 8 },
    { cantidadVendida: 0, stockFinal: 8 },
  ]);
  assert.equal(resumen.ventaEsperada, 4800);
  assert.equal(resumen.diferencia, 200);
});

test('slots of the same product share truck stock and the replenishment maximum', () => {
  const second = { ...slot, id_maquina_producto: 2 };
  const otherProduct = { ...slot, id_maquina_producto: 3, id_producto: 5 };
  const lines = calculateLines([slot, second, otherProduct], {
    1: { stockEncontrado: '5', cantidadRepuesta: '4', cantidadRetirada: '0' },
    2: { stockEncontrado: '5', cantidadRepuesta: '4', cantidadRetirada: '0' },
    3: { stockEncontrado: '5', cantidadRepuesta: '1', cantidadRetirada: '0' },
  }, new Map([[4, 7], [5, 2]]));

  assert.match(lines[0].errors.cantidadRepuesta, /Total a reponer de este producto: 8/);
  assert.match(lines[1].errors.cantidadRepuesta, /Disponible en camioneta: 7/);
  assert.deepEqual(lines.map(({ maximoReponible }) => maximoReponible), [3, 3, 2]);
  assert.deepEqual(lines[2].errors, {});
});

test('invalid quantities retain field errors without changing the entered values', () => {
  const values = Object.freeze({ stockEncontrado: '21', cantidadRepuesta: '1.5', cantidadRetirada: '22' });
  const [line] = calculateLines([slot], { 1: values }, new Map([[4, 100]]));

  assert.match(line.errors.stockEncontrado, /capacidad maxima/);
  assert.match(line.errors.cantidadRepuesta, /entero/);
  assert.match(line.errors.cantidadRetirada, /mas de lo encontrado/);
  assert.equal(line.values, values);
});

test('the request uses the reviewed version, stock and price with the supplied operation ID', () => {
  const resumen = calculateResumen([slot], {
    1: { stockEncontrado: '6', cantidadRepuesta: '4', cantidadRetirada: '2' },
  }, '5000');
  const operationId = '11111111-1111-4111-8111-111111111111';
  const payload = buildReposicionPayload(operationId, '3', '2', 'Visita', resumen);

  assert.deepEqual(payload, {
    id_operacion: operationId, id_maquina: 3, id_repartidor: 2,
    dinero_retirado: 5000, observacion: 'Visita', venta_esperada: 4800, diferencia_dinero: 200,
    detalles: [{
      id_maquina_producto: 1, version: 7, stock_sistema: 10, stock_encontrado: 6,
      cantidad_vendida: 4, cantidad_repuesta: 4, cantidad_retirada: 2, stock_final: 8,
      precio_venta_actual: 1200, venta_esperada: 4800,
    }],
  });
  assert.equal(resumen.detalles[0].item, slot);
});
