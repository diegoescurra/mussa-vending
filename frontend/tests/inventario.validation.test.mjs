import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateInventarioForm } from '../src/pages/admin/inventario/inventario.validation.ts';

const validForm = {
  id_maquina: '1', id_producto: '2', capacidad_maxima: '20',
  stock_actual: '10', precio_venta_actual: '1200', estado: 'true',
};

test('accepts valid quantities, including stock equal to capacity', () => {
  assert.deepEqual(validateInventarioForm(validForm), {});
  assert.deepEqual(validateInventarioForm({ ...validForm, stock_actual: '20' }), {});
});

test('accepts zero capacity, zero stock and zero price', () => {
  assert.deepEqual(validateInventarioForm({ ...validForm, capacidad_maxima: '0', stock_actual: '0', precio_venta_actual: '0' }), {});
});

test('stock greater than capacity produces a field-specific explanation', () => {
  assert.match(validateInventarioForm({ ...validForm, stock_actual: '21' }).stock_actual, /capacidad maxima de 20 unidades/);
});

test('lowering capacity revalidates stock using the new capacity', () => {
  assert.match(validateInventarioForm({ ...validForm, capacidad_maxima: '5' }).stock_actual, /capacidad maxima de 5 unidades/);
});

for (const field of ['capacidad_maxima', 'stock_actual']) {
  for (const value of ['', ' ', '-1', '1.5', 'NaN', 'Infinity', '2147483648']) {
    test(`rejects invalid ${field}: ${JSON.stringify(value)}`, () => {
      assert.ok(validateInventarioForm({ ...validForm, [field]: value })[field]);
    });
  }
}

for (const field of ['id_maquina', 'id_producto']) {
  for (const value of ['', ' ', '0', '-1', '1.5', '2147483648']) {
    test(`rejects invalid ${field}: ${JSON.stringify(value)}`, () => {
      assert.ok(validateInventarioForm({ ...validForm, [field]: value })[field]);
    });
  }
}

for (const value of ['', ' ', '-1', 'NaN', 'Infinity', '10000000000', '1.001']) {
  test(`rejects invalid price: ${JSON.stringify(value)}`, () => {
    assert.ok(validateInventarioForm({ ...validForm, precio_venta_actual: value }).precio_venta_actual);
  });
}

test('accepts two-decimal prices and numeric upper bounds', () => {
  assert.deepEqual(validateInventarioForm({ ...validForm, precio_venta_actual: '19.99' }), {});
  assert.deepEqual(validateInventarioForm({ ...validForm, capacidad_maxima: '2147483647', stock_actual: '2147483647', precio_venta_actual: '9999999999.99' }), {});
});

test('rejects an unknown state and accepts inactive', () => {
  assert.ok(validateInventarioForm({ ...validForm, estado: 'invalid' }).estado);
  assert.deepEqual(validateInventarioForm({ ...validForm, estado: 'false' }), {});
});
