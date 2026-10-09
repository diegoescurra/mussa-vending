import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  validateProveedorForm,
  proveedorFormToCreatePayload,
  proveedorFormToUpdatePayload,
} from '../src/pages/admin/proveedores/proveedores.validation.ts';

test('nombre obligatorio, incluyendo espacios, tabs y saltos de linea', () => {
  for (const nombre of ['', '   ', '\t\n']) {
    assert.equal(validateProveedorForm({ nombre, estado: 'true' }).nombre, 'Escribe el nombre del proveedor.');
  }
});

test('acepta nombres con espacios internos y recorta los extremos del payload', () => {
  const form = { nombre: '  Proveedor del sur \n', estado: 'true' };
  assert.deepEqual(validateProveedorForm(form), {});
  assert.deepEqual(proveedorFormToCreatePayload(form), { nombre: 'Proveedor del sur' });
  assert.deepEqual(proveedorFormToUpdatePayload(form), { nombre: 'Proveedor del sur', estado: true });
});

test('PUT completo permite desactivar y reactivar con estado booleano', () => {
  for (const estado of ['true', 'false']) {
    const form = { nombre: 'Proveedor', estado };
    assert.deepEqual(validateProveedorForm(form, true), {});
    assert.deepEqual(proveedorFormToUpdatePayload(form), { nombre: 'Proveedor', estado: estado === 'true' });
  }
});

test('valida estado al editar, no lo requiere al crear', () => {
  for (const estado of ['', '1', 'TRUE', 'activo']) {
    const form = { nombre: 'Proveedor', estado };
    assert.ok(validateProveedorForm(form, true).estado);
    assert.deepEqual(validateProveedorForm(form), {});
  }
});

test('devuelve ambos errores de campo sin modificar el formulario', () => {
  const form = Object.freeze({ nombre: ' ', estado: '' });
  assert.deepEqual(Object.keys(validateProveedorForm(form, true)), ['nombre', 'estado']);
  assert.equal(form.nombre, ' ');
});
