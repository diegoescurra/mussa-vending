import { test, expect, apiURL, loginApi } from './fixtures.mjs';
import { readFile } from 'node:fs/promises';

test('bodeguero: cuenta, acceso limitado, movimientos, entrega y conteo con identidad de sesión', async ({ page, context, request, db }, testInfo) => {
  // Compatibilidad con las bases antiguas que usaban enum para el rol.
  await db.query(`
    CREATE TYPE rol_usuario_legacy AS ENUM ('ADMIN', 'REPONEDOR');
    ALTER TABLE usuarios DROP CONSTRAINT usuarios_rol_check;
    ALTER TABLE usuarios ALTER COLUMN rol TYPE rol_usuario_legacy USING rol::rol_usuario_legacy;
    ALTER TABLE usuarios ALTER COLUMN rol SET DEFAULT 'REPONEDOR';
  `);
  const migration = await readFile(new URL('../../../backend/db/migrations/012_bodeguero_role.sql', import.meta.url), 'utf8');
  await db.query(migration);
  await db.query(migration);
  await page.goto('/admin/usuarios');
  await page.getByRole('button', { name: 'Nuevo usuario', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Carla');
  await page.getByLabel('Apellido', { exact: true }).fill('Bodega');
  await page.getByLabel('Email', { exact: true }).fill('carla@test.invalid');
  await page.getByLabel('Contraseña', { exact: true }).fill('Test1234');
  await page.getByLabel('Rol', { exact: true }).selectOption('BODEGUERO');
  await page.getByRole('button', { name: 'Guardar usuario', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'carla@test.invalid' })).toContainText('BODEGUERO');
  const userId = (await db.query("SELECT id_usuario FROM usuarios WHERE email = 'carla@test.invalid'")).rows[0].id_usuario;
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Correo electrónico').fill('carla@test.invalid');
  await page.getByLabel('Contraseña', { exact: true }).fill('Test1234');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/bodega$/);
  await expect(page.getByRole('heading', { name: 'Bodega', exact: true })).toBeVisible();
  for (const section of ['Productos', 'Proveedores', 'Usuarios', 'Inicio']) {
    await expect(page.getByRole('link', { name: section, exact: true })).toHaveCount(0);
  }
  for (const path of ['usuarios', 'productos', 'proveedores', 'dashboard']) {
    await page.goto(`/admin/${path}`);
    await expect(page).toHaveURL(/\/admin\/bodega$/);
  }
  await page.goto('/reposicion');
  await expect(page).toHaveURL(/\/bodega$/);

  // Peticiones HTTP directas: ocultar el menú no es la barrera de permisos.
  const csrf = await loginApi(context.request, 'carla@test.invalid', 'Test1234');
  const headers = { 'X-CSRF-Token': csrf };
  for (const path of ['/usuarios', '/usuarios/1', '/productos', '/productos/1', '/proveedores', '/dashboard']) {
    expect((await context.request.get(apiURL + path)).status(), path).toBe(403);
  }
  for (const [method, path, data] of [
    ['post', '/usuarios', { rol: 'ADMIN' }],
    ['put', `/usuarios/${userId}`, { rol: 'ADMIN' }],
    ['post', '/productos', { nombre: 'No autorizado' }],
    ['put', '/productos/1', { nombre: 'No autorizado' }],
    ['delete', '/productos/1', undefined],
    ['post', '/proveedores', { nombre: 'No autorizado' }],
    ['post', '/reposiciones', {}],
  ]) {
    expect((await context.request[method](apiURL + path, { headers, data })).status(), `${method} ${path}`).toBe(403);
  }
  expect((await request.post(`${apiURL}/bodega/movimientos`, { data: { id_producto: 1, tipo: 'ENTRADA', cantidad: 99 } })).status()).toBe(401);
  expect((await request.post(`${apiURL}/bodega/movimientos`, { headers: { Cookie: 'admin=true; mussa.sid=inventada' }, data: {} })).status()).toBe(401);
  const options = (await (await context.request.get(`${apiURL}/productos/opciones`)).json()).data;
  expect(options).toEqual([{ id_producto: 1, nombre: 'Agua integración' }]);
  const drivers = (await (await context.request.get(`${apiURL}/usuarios/reponedores`)).json()).data;
  expect(drivers).toEqual([{ id_usuario: 2, nombre: 'Luis', apellido: 'Ruta' }]);

  await page.getByRole('button', { name: 'Registrar movimiento', exact: true }).click();
  await page.getByLabel('Producto', { exact: true }).selectOption('1');
  await page.getByLabel('Cantidad', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Guardar movimiento', exact: true }).click();
  await expect(page.getByText('Movimiento registrado correctamente.', { exact: true })).toBeVisible();

  // Aunque el cliente invente otro responsable, se registra el usuario autenticado.
  await page.route(`${apiURL}/camionetas/1/cargas`, route => route.continue({ postData: JSON.stringify({ ...route.request().postDataJSON(), id_bodeguero: 1 }) }));
  await page.getByRole('button', { name: 'Entregar a camioneta', exact: true }).click();
  await page.getByLabel('Camioneta', { exact: true }).selectOption('1');
  await expect(page.getByRole('dialog')).toContainText('Luis Ruta');
  await page.getByLabel('Producto', { exact: true }).selectOption('1');
  await page.getByLabel('Cantidad aprobada').fill('5');
  await page.getByRole('button', { name: 'Confirmar entrega', exact: true }).click();
  await expect(page.getByText('Entrega a camioneta registrada correctamente.', { exact: true })).toBeVisible();
  expect((await db.query('SELECT id_bodeguero FROM camioneta_movimientos')).rows[0].id_bodeguero).toBe(userId);

  await page.route(`${apiURL}/conteos`, route => route.request().method() === 'POST'
    ? route.continue({ postData: JSON.stringify({ ...route.request().postDataJSON(), id_responsable: 1 }) })
    : route.continue());
  await page.getByRole('button', { name: 'Registrar conteo fisico', exact: true }).click();
  await page.getByLabel('Producto', { exact: true }).selectOption('1');
  await page.getByLabel('Stock fisico').fill('34');
  await page.getByRole('button', { name: 'Guardar conteo', exact: true }).click();
  await expect(page.getByRole('table').last()).toContainText('-1 (Faltante)');
  expect((await db.query('SELECT id_responsable, id_camioneta FROM conteos')).rows[0]).toEqual({ id_responsable: userId, id_camioneta: null });
  expect((await db.query('SELECT stock_actual FROM bodega_productos')).rows[0].stock_actual).toBe(35);
  expect((await db.query('SELECT stock_actual FROM camioneta_productos')).rows[0].stock_actual).toBe(15);
  // También puede registrar una salida manual; no modifica el catálogo.
  expect((await context.request.post(`${apiURL}/bodega/movimientos`, { headers, data: { id_producto: 1, tipo: 'SALIDA', cantidad: 1 } })).status()).toBe(201);
  expect((await db.query('SELECT stock_actual FROM bodega_productos')).rows[0].stock_actual).toBe(34);

  await page.reload();
  await expect(page.getByRole('table').first()).toContainText('34');
  await page.screenshot({ path: testInfo.outputPath('bodega-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('bodega-mobile.png'), fullPage: true });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('link', { name: 'Camionetas', exact: true }).click();
  const truckRow = page.getByRole('row').filter({ hasText: 'TEST01' });
  await truckRow.getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(page.getByLabel('Repartidor', { exact: true })).toHaveValue('2');
  await page.getByLabel('Nombre', { exact: true }).fill('Ruta bodega');
  await page.getByRole('button', { name: 'Guardar camioneta', exact: true }).click();
  await expect(truckRow).toContainText('Ruta bodega');
  await truckRow.getByRole('link', { name: 'Inventario', exact: true }).click();
  await page.getByRole('button', { name: 'Registrar conteo fisico', exact: true }).click();
  await page.getByLabel('Producto', { exact: true }).selectOption('1');
  await page.getByLabel('Stock fisico').fill('15');
  await page.getByRole('button', { name: 'Guardar conteo', exact: true }).click();
  await expect(page.getByRole('table').last()).toContainText('Carla Bodega');
  expect((await db.query('SELECT id_responsable FROM conteos WHERE id_camioneta = 1')).rows[0].id_responsable).toBe(userId);

  await page.getByRole('link', { name: 'Máquinas', exact: true }).click();
  const machineRow = page.getByRole('row').filter({ hasText: 'M-001' });
  await machineRow.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Máquina bodega');
  await page.getByLabel('Descripción', { exact: true }).fill('Equipo revisado por bodega');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(machineRow).toContainText('Máquina bodega');
  await page.getByRole('link', { name: 'Inventario', exact: true }).click();
  const productRow = page.getByRole('row').filter({ hasText: 'Agua integración' });
  await productRow.getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(page.getByLabel('Producto', { exact: true })).toHaveValue('1');
  await page.getByLabel('Stock actual', { exact: true }).fill('9');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Editar producto de la máquina', exact: true })).toHaveCount(0);
  expect((await db.query('SELECT stock_actual FROM maquina_productos WHERE id_maquina_producto = 1')).rows[0].stock_actual).toBe(9);
});
