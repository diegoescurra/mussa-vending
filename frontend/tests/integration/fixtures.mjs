import { createRequire } from 'node:module';
import { test as base, expect } from '@playwright/test';

const requireBackend = createRequire(new URL('../../../backend/package.json', import.meta.url));
const { Client } = requireBackend('pg');
const bcrypt = requireBackend('bcrypt');
export const testPassword = 'Mussa-test-password-123';
const passwordHash = await bcrypt.hash(testPassword, 12);
export const apiURL = 'http://127.0.0.1:3011/api';

export async function loginApi(request, email = 'ana@test.invalid', password = testPassword) {
  const session = await request.get(apiURL + '/auth/session');
  const current = (await session.json()).data;
  if (current.user?.email === email) return current.csrfToken;
  const login = await request.post(apiURL + '/auth/login', { data: { email, password }, headers: { 'X-CSRF-Token': current.csrfToken } });
  expect(login.status(), await login.text()).toBe(200);
  return (await login.json()).data.csrfToken;
}

export const test = base.extend({
  authenticated: [true, { option: true }],
  auth: [async ({ context, db, authenticated }, use) => {
    if (authenticated) await loginApi(context.request);
    await use();
  }, { auto: true }],
  browserErrors: [async ({ context }, use) => {
    const errors = [];
    const watchPage = page => {
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error' && /Encountered two children|Each child in a list/.test(message.text())) {
          errors.push(message.text());
        }
      });
    };
    context.pages().forEach(watchPage);
    context.on('page', watchPage);
    await use();
    expect(errors, 'Errores de JavaScript o claves de React repetidas durante el recorrido').toEqual([]);
  }, { auto: true }],
  db: async ({}, use) => {
    const url = new URL(process.env.MUSSA_TEST_DATABASE_URL);
    if (url.hostname !== '127.0.0.1' || url.pathname !== '/mussa_integration' || url.username !== 'mussa_test') {
      throw new Error('Las pruebas solo pueden reiniciar la base de datos local mussa_integration del runner.');
    }
    const db = new Client({ connectionString: url.href });
    await db.connect();
    try {
      await db.query(`
        TRUNCATE sesiones, proveedores, usuarios, maquinas, reposicion_operaciones RESTART IDENTITY CASCADE;
        INSERT INTO proveedores (nombre) VALUES ('Proveedor integración');
        INSERT INTO productos (nombre, precio_venta, costo_compra, id_proveedor)
          VALUES ('Agua integración', 1200, 500, 1);
        INSERT INTO usuarios (nombre, apellido, email, password_hash, rol) VALUES
          ('Ana', 'Bodega', 'ana@test.invalid', 'test-only', 'ADMIN'),
          ('Luis', 'Ruta', 'luis@test.invalid', 'test-only', 'REPONEDOR');
        INSERT INTO camionetas (patente, nombre, id_repartidor) VALUES ('TEST01', 'Ruta integración', 2);
        INSERT INTO maquinas (codigo, nombre, ubicacion, modelo, sistemas_pago)
          VALUES ('M-001', 'Máquina integración', 'Oficina', 'Modelo prueba', ARRAY['MONEDA']);
        INSERT INTO maquina_productos (id_maquina, id_producto, capacidad_maxima, stock_actual, precio_venta_actual)
          VALUES (1, 1, 20, 10, 1200);
        INSERT INTO bodega_productos VALUES (1, 30);
        INSERT INTO camioneta_productos VALUES (1, 1, 10);
      `);
      await db.query('UPDATE usuarios SET password_hash = $1', [passwordHash]);
      await use(db);
    } finally {
      await db.end();
    }
  },
  // Reinicia los datos también en pruebas que solo usan la interfaz.
  seed: [async ({ db }, use) => { await use(db); }, { auto: true }],
});

export { expect };

export async function reviewReposicion(page) {
  await loginApi(page.context().request, 'luis@test.invalid');
  await page.goto('/reposicion');
  await page.getByLabel('Buscar máquina').fill('M-001');
  await page.getByRole('button', { name: /M-001 - Máquina integración/ }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('Paso 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Encontrado antes del retiro').fill('6');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('spinbutton', { name: /^Repuesto/ }).fill('4');
  await page.getByLabel('Retirado', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Dinero retirado', { exact: true }).fill('5000');
  await page.getByLabel('Observación', { exact: true }).fill('Ruta de integración');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('Sistema: 10 | Encontrado: 6 | Vendido: 4 | Repuesto: 4 | Retirado: 2 | Final: 8')).toBeVisible();
}

export async function expectRestockBalances(db, truckStock = 6) {
  const { rows: [balance] } = await db.query(`SELECT
    (SELECT stock_actual FROM maquina_productos WHERE id_maquina_producto = 1) AS maquina,
    (SELECT stock_actual FROM camioneta_productos WHERE id_camioneta = 1 AND id_producto = 1) AS camioneta,
    (SELECT count(*)::int FROM reposiciones) AS reposiciones,
    (SELECT count(*)::int FROM reposicion_detalles) AS detalles,
    (SELECT count(*)::int FROM camioneta_movimientos WHERE tipo = 'SALIDA') AS salidas`);
  expect(balance).toEqual({ maquina: 8, camioneta: truckStock, reposiciones: 1, detalles: 1, salidas: 1 });
  const { rows: [detail] } = await db.query('SELECT cantidad_vendida, cantidad_retirada, reposicion_detalles.venta_esperada, diferencia_dinero FROM reposicion_detalles JOIN reposiciones USING (id_reposicion)');
  expect(detail).toEqual({ cantidad_vendida: 4, cantidad_retirada: 2, venta_esperada: '4800.00', diferencia_dinero: '200.00' });
}
