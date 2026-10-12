import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inventarioToForm, inventarioFormToUpdatePayload } from '../src/pages/admin/inventario/inventario.mapper.ts';

const original = {
  id_maquina: 1, id_producto: 2, capacidad_maxima: 20, stock_actual: 10,
  precio_venta_actual: '1200.00', estado: true, version: 7,
};

test('editing only price never resends stock from the open form', () => {
  const form = { ...inventarioToForm(original), precio_venta_actual: '1500' };
  assert.deepEqual(inventarioFormToUpdatePayload(form, original), { version: 7, precio_venta_actual: 1500 });
});

test('explicit stock changes include the version seen when opening', () => {
  const form = { ...inventarioToForm(original), stock_actual: '15' };
  assert.deepEqual(inventarioFormToUpdatePayload(form, original), { version: 7, stock_actual: 15 });
});

test('unchanged numeric values do not cause writes', () => {
  const form = { ...inventarioToForm(original), precio_venta_actual: '1200' };
  assert.deepEqual(inventarioFormToUpdatePayload(form, original), { version: 7 });
});
