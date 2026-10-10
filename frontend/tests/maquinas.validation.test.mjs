import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMaquinaForm, toMaquinaPayload } from '../src/pages/admin/maquinas/maquinas.validation.ts';
import { emptyMaquinaForm, maquinaToForm } from '../src/pages/admin/maquinas/maquinas.mapper.ts';

const valid = {
  codigo: 'M-01', nombre: 'Maquina principal', modelo: 'Necta Opera',
  descripcion: 'Snacks y bebidas', ubicacion: 'Recepcion', estado: 'ACTIVA',
  sistemas_pago: ['MONEDA'],
};

test('requires model and at least one payment, including for legacy machines', () => {
  const errors = validateMaquinaForm({ ...valid, modelo: ' \t ', sistemas_pago: [] });
  assert.ok(errors.modelo);
  assert.ok(errors.sistemas_pago);
  assert.equal(emptyMaquinaForm.modelo, '');
  assert.deepEqual(emptyMaquinaForm.sistemas_pago, []);
});

test('accepts all seven independent payment combinations', () => {
  const options = ['MONEDA', 'BILLETE', 'TARJETA'];
  for (let mask = 1; mask < 8; mask++) {
    const sistemas_pago = options.filter((_, index) => mask & (1 << index));
    assert.deepEqual(validateMaquinaForm({ ...valid, sistemas_pago }), {});
  }
});

test('rejects duplicate, unsupported and non-array payments', () => {
  for (const sistemas_pago of [['MONEDA', 'MONEDA'], ['moneda'], ['EFECTIVO'], [null], [['MONEDA']], 'MONEDA', null]) {
    assert.ok(validateMaquinaForm({ ...valid, sistemas_pago }).sistemas_pago);
  }
});

test('trims payload text and copies payment selections without mutating form', () => {
  const form = { ...valid, modelo: '  Necta Opera  ', nombre: '  Principal  ' };
  const payload = toMaquinaPayload(form);
  assert.equal(payload.modelo, 'Necta Opera');
  assert.equal(payload.nombre, 'Principal');
  assert.equal(form.modelo, '  Necta Opera  ');
  assert.notEqual(payload.sistemas_pago, form.sistemas_pago);
  assert.deepEqual(payload.sistemas_pago, ['MONEDA']);
});

test('editing preserves saved selections without aliasing the machine array', () => {
  const maquina = { ...valid, sistemas_pago: ['MONEDA', 'TARJETA'], id_maquina: 1, fecha_creacion: '2026-10-09' };
  const form = maquinaToForm(maquina);
  assert.deepEqual(form.sistemas_pago, ['MONEDA', 'TARJETA']);
  form.sistemas_pago.pop();
  assert.deepEqual(maquina.sistemas_pago, ['MONEDA', 'TARJETA']);
});

test('requires existing text fields and a valid machine state', () => {
  const errors = validateMaquinaForm({ ...emptyMaquinaForm, estado: 'OTRO' });
  for (const key of ['codigo', 'nombre', 'modelo', 'descripcion', 'ubicacion', 'estado', 'sistemas_pago']) {
    assert.ok(errors[key]);
  }
});
