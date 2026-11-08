import { test, expect, apiURL, reviewReposicion, expectRestockBalances, loginApi, testPassword } from './fixtures.mjs';
import { readFile } from 'node:fs/promises';

test('catálogo: un error conserva el formulario y permite corregir, editar y eliminar', async ({ page, db }) => {
  await page.goto('/admin/productos');
  await page.getByRole('button', { name: 'Nuevo producto', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Agua integración');
  await page.getByLabel('Precio venta').fill('1500');
  await page.getByLabel('Costo compra').fill('600');
  await page.getByLabel('Proveedor', { exact: true }).selectOption('1');
  // Duplicado real: la API debe mostrar su error sin perder los campos.
  const duplicate = page.waitForResponse(response => response.url() === `${apiURL}/productos` && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
  expect((await duplicate).status()).toBe(409);
  await expect(page.getByRole('alert')).toHaveText('Ya existe un producto con ese nombre.');
  await expect(page.getByLabel('Precio venta')).toHaveValue('1500');
  await page.getByLabel('Nombre', { exact: true }).fill('Jugo integración');
  await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: 'Jugo integración' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Agua integración');
  const duplicateUpdate = page.waitForResponse(response => response.url().startsWith(`${apiURL}/productos/`) && response.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  expect((await duplicateUpdate).status()).toBe(409);
  await expect(page.getByRole('alert')).toHaveText('Ya existe un producto con ese nombre.');
  await page.getByLabel('Nombre', { exact: true }).fill('Jugo integración');
  await page.getByLabel('Precio venta').fill('1700');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Editar producto', exact: true })).toHaveCount(0);
  expect((await db.query("SELECT precio_venta FROM productos WHERE nombre = 'Jugo integración'")).rows[0].precio_venta).toBe('1700.00');
  await row.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(row).toHaveCount(0);
  expect((await db.query("SELECT count(*)::int AS total FROM productos WHERE nombre = 'Jugo integración'")).rows[0].total).toBe(0);
});

test('catálogo paginado: búsqueda y filtros sobre todos los registros, cambio de tamaño y cancelación', async ({ page, db }) => {
  await db.query(`
    INSERT INTO productos (nombre, precio_venta, costo_compra, id_proveedor, estado)
      SELECT 'Producto ' || lpad(n::text, 2, '0'), n * 100, 50, 1, n <= 50
      FROM generate_series(1, 51) n;
  `);
  await page.goto('/admin/productos');
  const region = page.getByRole('region', { name: 'Buscar producto...', exact: true });
  const rows = region.locator('tbody tr');
  await expect(rows).toHaveCount(25);
  await expect(region.getByRole('status')).toHaveText('1–25 de 52 registros');
  await region.getByRole('button', { name: 'Última página', exact: true }).click();
  await expect(rows).toHaveCount(2);
  await region.getByRole('textbox').fill('Producto 01');
  await expect(rows).toHaveCount(1);
  await expect(region.getByRole('status')).toHaveText('1–1 de 1 registros');
  await region.getByRole('textbox').clear();
  await region.getByLabel('Todos los estados').selectOption('false');
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('Producto 51');
  await region.getByLabel('Todos los estados').selectOption('');
  await region.getByLabel('Filas por página').selectOption('10');
  await expect(rows).toHaveCount(10);
  await region.getByRole('button', { name: 'Nombre', exact: true }).click();
  await expect(rows.first()).toContainText('Agua integración');
  await region.getByRole('button', { name: 'Nombre', exact: true }).click();
  await expect(rows.first()).toContainText('Producto 51');
  await rows.first().getByRole('button', { name: 'Eliminar', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect((await db.query('SELECT count(*)::int AS total FROM productos')).rows[0].total).toBe(52);
});

test('panel claro: navegación completa, modales y tablas en escritorio y móvil', async ({ page, db }, testInfo) => {
  await db.query(await readFile(new URL('../../../backend/db/seed-productos-reales.sql', import.meta.url), 'utf8'));
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [path, title] of [
    ['productos', 'Productos'], ['proveedores', 'Proveedores'], ['maquinas', 'Máquinas'],
    ['inventario?maquina=1', 'Inventario por máquina'], ['bodega', 'Bodega'], ['camionetas', 'Camionetas'],
    ['camionetas/1/inventario', 'Inventario: Ruta integración'], ['usuarios', 'Usuarios y repartidores'], ['dashboard', 'Resumen operativo'],
  ]) {
    await page.goto(`/admin/${path}`);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  await page.screenshot({ path: testInfo.outputPath('dashboard-desktop.png'), fullPage: true });
  for (const tab of ['Caja y visitas', 'Stock', 'Ventas y margen']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await expect(page.getByRole('tabpanel')).toBeVisible();
  }
  await page.goto('/admin/productos');
  await expect(page.locator('tbody tr')).toHaveCount(25);
  await page.screenshot({ path: testInfo.outputPath('productos-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Nuevo producto', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('producto-modal.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Nuevo producto', exact: true })).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Bodega', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Bodega', exact: true })).toBeVisible();
  await expect(page.getByText('No hay movimientos para mostrar.', { exact: true })).toBeVisible();
  expect(await page.getByText('No hay movimientos para mostrar.', { exact: true }).evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return bounds.left >= 0 && bounds.right <= window.innerWidth;
  })).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('bodega-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto('/admin/productos');
  await expect(page.locator('tbody tr')).toHaveCount(25);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('productos-mobile.png'), fullPage: true });
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('tab', { name: 'Stock', exact: true })).toBeVisible();
  const tabsBounds = await page.getByRole('tablist').boundingBox();
  const lastTabBounds = await page.getByRole('tab', { name: 'Ventas y margen', exact: true }).boundingBox();
  expect(lastTabBounds.y + lastTabBounds.height).toBeLessThanOrEqual(tabsBounds.y + tabsBounds.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/admin/bodega');
  await expect(page.getByRole('heading', { name: 'Bodega', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('usuarios y camionetas: crear, asignar, editar y eliminar desde la interfaz', async ({ page, db }) => {
  await page.goto('/admin/usuarios');
  await page.getByRole('button', { name: 'Nuevo usuario', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Carla');
  await page.getByLabel('Apellido', { exact: true }).fill('Nueva');
  await page.getByLabel('Email', { exact: true }).fill('carla@test.invalid');
  await page.getByLabel('Contraseña', { exact: true }).fill(testPassword);
  await page.getByRole('button', { name: 'Guardar usuario', exact: true }).click();
  const userRow = page.getByRole('row').filter({ hasText: 'carla@test.invalid' });
  await expect(userRow).toBeVisible();
  await userRow.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Apellido', { exact: true }).fill('Ruta');
  await page.getByRole('button', { name: 'Guardar usuario', exact: true }).click();
  await expect(userRow).toContainText('Ruta');

  await page.getByRole('link', { name: 'Camionetas', exact: true }).click();
  await page.getByRole('button', { name: 'Nueva camioneta', exact: true }).click();
  const driver = page.getByLabel('Repartidor', { exact: true });
  await expect(driver.getByRole('option', { name: /Luis Ruta/ })).toHaveCount(0);
  await driver.selectOption({ label: 'Carla Ruta' });
  await page.getByLabel('Patente', { exact: true }).fill('test02');
  await page.getByLabel('Nombre', { exact: true }).fill('Nueva ruta');
  await page.getByRole('button', { name: 'Guardar camioneta', exact: true }).click();
  const truckRow = page.getByRole('row').filter({ hasText: 'TEST02' });
  await expect(truckRow).toContainText('Carla Ruta');
  await truckRow.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Ruta editada');
  await page.getByRole('button', { name: 'Guardar camioneta', exact: true }).click();
  await expect(truckRow).toContainText('Ruta editada');
  await truckRow.getByRole('link', { name: 'Inventario', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inventario: Ruta editada', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Volver a camionetas' }).click();
  await truckRow.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(truckRow).toHaveCount(0);
  await page.getByRole('link', { name: 'Usuarios', exact: true }).click();
  await userRow.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(userRow).toHaveCount(0);
  expect((await db.query("SELECT count(*)::int AS total FROM usuarios WHERE email = 'carla@test.invalid'")).rows[0].total).toBe(0);
});

test('máquinas: configurar, asignar producto, editar inventario y eliminar', async ({ page, db }) => {
  await page.goto('/admin/maquinas');
  await page.getByRole('button', { name: 'Nueva máquina', exact: true }).click();
  await page.getByLabel('Código', { exact: true }).fill('M-002');
  await page.getByLabel('Nombre', { exact: true }).fill('Máquina nueva');
  await page.getByLabel('Modelo', { exact: true }).fill('Modelo nuevo');
  await page.getByRole('checkbox', { name: 'Moneda', exact: true }).check();
  await page.getByLabel('Ubicación', { exact: true }).fill('Recepción');
  await page.getByLabel('Descripción', { exact: true }).fill('Máquina de prueba');
  await page.getByRole('button', { name: 'Crear máquina', exact: true }).click();
  const machineRow = page.getByRole('row').filter({ hasText: 'M-002' });
  await expect(machineRow).toContainText('Modelo nuevo');
  await machineRow.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Ubicación', { exact: true }).fill('Piso 2');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(machineRow).toContainText('Piso 2');
  await page.goto('/admin/inventario?maquina=2');
  await page.getByRole('button', { name: 'Añadir producto a esta máquina', exact: true }).click();
  await page.getByLabel('Producto', { exact: true }).selectOption('1');
  await page.getByLabel('Capacidad máxima', { exact: true }).fill('15');
  await page.getByLabel('Stock actual', { exact: true }).fill('5');
  await page.getByLabel('Precio actual', { exact: true }).fill('1300');
  await page.getByRole('button', { name: 'Asignar producto', exact: true }).click();
  const productRow = page.getByRole('row').filter({ hasText: 'Agua integración' });
  await expect(productRow).toBeVisible();
  await expect(page.getByRole('button', { name: 'Añadir producto a esta máquina', exact: true })).toBeDisabled();
  await productRow.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Stock actual', { exact: true }).fill('7');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Editar producto de la máquina', exact: true })).toHaveCount(0);
  expect((await db.query('SELECT stock_actual, version FROM maquina_productos WHERE id_maquina = 2')).rows[0]).toEqual({ stock_actual: 7, version: 2 });
  await productRow.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(productRow).toHaveCount(0);
  await page.goto('/admin/maquinas');
  await machineRow.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(machineRow).toHaveCount(0);
  expect((await db.query('SELECT count(*)::int AS total FROM maquinas WHERE id_maquina = 2')).rows[0].total).toBe(0);
});

test('bodega → camioneta → reposición → conteos → dashboard: saldos e historiales coherentes', async ({ page, db }) => {
  await page.goto('/admin/bodega');
  await page.getByRole('button', { name: 'Registrar movimiento', exact: true }).click();
  await page.getByLabel('Producto', { exact: true }).selectOption('1');
  await page.getByLabel('Cantidad', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Guardar movimiento', exact: true }).click();
  await expect(page.getByText('Movimiento registrado correctamente.', { exact: true })).toBeVisible();
  await expect(page.getByRole('table').first().getByRole('row').filter({ hasText: 'Agua integración' })).toContainText('40');
  await page.getByRole('button', { name: 'Entregar a camioneta', exact: true }).click();
  await page.getByLabel('Camioneta', { exact: true }).selectOption('1');
  await page.getByLabel('Producto', { exact: true }).selectOption('1');
  await page.getByLabel('Cantidad aprobada').fill('5');
  await page.getByRole('button', { name: 'Confirmar entrega', exact: true }).click();
  await expect(page.getByText('Entrega a camioneta registrada correctamente.', { exact: true })).toBeVisible();
  await expect(page.getByRole('table').first().getByRole('row').filter({ hasText: 'Agua integración' })).toContainText('35');

  await reviewReposicion(page);
  await page.getByRole('button', { name: 'Finalizar reposición', exact: true }).click();
  await expect(page.getByText('Reposición enviada correctamente.', { exact: true })).toBeVisible();
  await expectRestockBalances(db, 11);

  await loginApi(page.context().request);
  for (const [path, fisico, diferencia] of [
    ['/admin/bodega', '33', '-2'],
    ['/admin/camionetas/1/inventario', '10', '-1'],
  ]) {
    await page.goto(path);
    await page.getByRole('button', { name: 'Registrar conteo fisico', exact: true }).click();
    await page.getByLabel('Producto', { exact: true }).selectOption('1');
    await page.getByLabel('Stock fisico').fill(fisico);
    await page.getByRole('button', { name: 'Guardar conteo', exact: true }).click();
    await expect(page.getByRole('table').last()).toContainText(`${diferencia} (Faltante)`);
  }
  const { rows } = await db.query('SELECT stock_esperado, stock_fisico, diferencia FROM conteos ORDER BY id_conteo');
  expect(rows).toEqual([
    { stock_esperado: 35, stock_fisico: 33, diferencia: -2 },
    { stock_esperado: 11, stock_fisico: 10, diferencia: -1 },
  ]);
  expect((await db.query('SELECT stock_actual FROM bodega_productos')).rows[0].stock_actual).toBe(35);
  await expectRestockBalances(db, 11);
  await expect(page.getByRole('table').nth(1)).toContainText('Entrada');
  await expect(page.getByRole('table').nth(1)).toContainText('Salida');
  const dashboardResponse = page.waitForResponse(response => response.url().startsWith(`${apiURL}/dashboard?`));
  await page.goto('/');
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  const response = await dashboardResponse;
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  expect(data.indicadores).toMatchObject({ dinero_retirado: 5000, venta_estimada: 4800, diferencia_caja: 200, visitas: 1 });
  await expect(page.getByRole('heading', { name: 'Resumen operativo', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Stock', exact: true }).click();
  await expect(page.getByText('Máquinas activas', { exact: true })).toBeVisible();
  await page.getByLabel('Desde', { exact: true }).fill('2026-01-01');
  await page.getByLabel('Hasta', { exact: true }).fill('2026-01-31');
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('30');
  await page.getByLabel('Hasta', { exact: true }).fill('2026-01-30');
  const validPeriod = page.waitForResponse(response => response.url().includes('/dashboard?desde=2026-01-01&hasta=2026-01-30'));
  await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
  expect((await validPeriod).status()).toBe(200);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('respuesta perdida: reintentar usa la misma operación y descuenta stock una sola vez', async ({ page, db }) => {
  const requests = [];
  await page.route(`${apiURL}/reposiciones`, async route => {
    if (route.request().method() !== 'POST') return route.continue();
    requests.push(route.request().postDataJSON());
    if (requests.length === 1) {
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      await route.abort('failed'); // El servidor confirmó, pero el cliente perdió la respuesta.
    } else {
      await route.continue();
    }
  });
  await reviewReposicion(page);
  await page.getByRole('button', { name: 'Finalizar reposición', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reintentar envío', exact: true })).toBeEnabled();
  await expectRestockBalances(db);
  await expect(page.getByRole('button', { name: 'Atrás', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Reintentar envío', exact: true }).click();
  await expect(page.getByText('Reposición enviada correctamente.', { exact: true })).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
  await expectRestockBalances(db);
});

test('dos reposiciones simultáneas: una confirma y la otra puede recargar tras el conflicto', async ({ page, context, db }) => {
  await reviewReposicion(page);
  const second = await context.newPage();
  await reviewReposicion(second);
  const responses = await Promise.all([
    page.waitForResponse(response => response.url() === `${apiURL}/reposiciones` && response.request().method() === 'POST'),
    second.waitForResponse(response => response.url() === `${apiURL}/reposiciones` && response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Finalizar reposición', exact: true }).click(),
    second.getByRole('button', { name: 'Finalizar reposición', exact: true }).click(),
  ]);
  expect(responses.slice(0, 2).map(response => response.status()).sort()).toEqual([201, 409]);
  await expectRestockBalances(db);
  const conflicted = responses[0].status() === 409 ? page : second;
  await conflicted.getByRole('button', { name: 'Recargar inventario y empezar de nuevo' }).click();
  await expect(conflicted.getByText('Paso 1', { exact: true })).toBeVisible();
  await conflicted.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(conflicted.getByText('Stock sistema: 8', { exact: true })).toBeVisible();
});

test('entregas simultáneas: no permiten stock negativo y el rechazo no deja movimientos parciales', async ({ request, db }) => {
  await db.query('UPDATE bodega_productos SET stock_actual = 1');
  const payload = { id_bodeguero: 1, id_producto: 1, cantidad: 1 };
  const headers = { 'X-CSRF-Token': await loginApi(request) };
  // Fuerza un rechazo después de descontar bodega: la transacción debe revertirlo.
  await db.query('UPDATE camioneta_productos SET stock_actual = 2147483647');
  const overflow = await request.post(`${apiURL}/camionetas/1/cargas`, { data: payload, headers });
  expect(overflow.status()).toBe(409);
  expect((await db.query('SELECT stock_actual FROM bodega_productos')).rows[0].stock_actual).toBe(1);
  expect((await db.query('SELECT stock_actual FROM camioneta_productos')).rows[0].stock_actual).toBe(2147483647);
  expect((await db.query('SELECT count(*)::int AS total FROM bodega_movimientos')).rows[0].total).toBe(0);
  expect((await db.query('SELECT count(*)::int AS total FROM camioneta_movimientos')).rows[0].total).toBe(0);
  await db.query('UPDATE camioneta_productos SET stock_actual = 10');
  const results = await Promise.all([
    request.post(`${apiURL}/camionetas/1/cargas`, { data: payload, headers }),
    request.post(`${apiURL}/camionetas/1/cargas`, { data: payload, headers }),
  ]);
  expect(results.map(result => result.status()).sort()).toEqual([201, 409]);
  expect((await db.query('SELECT stock_actual FROM bodega_productos')).rows[0].stock_actual).toBe(0);
  expect((await db.query('SELECT stock_actual FROM camioneta_productos')).rows[0].stock_actual).toBe(11);
  expect((await db.query('SELECT count(*)::int AS total FROM bodega_movimientos')).rows[0].total).toBe(1);
  expect((await db.query('SELECT count(*)::int AS total FROM camioneta_movimientos')).rows[0].total).toBe(1);
});

test('historiales: cargar todas las páginas sin perder ni duplicar registros', async ({ page, db }) => {
  await db.query(`
    INSERT INTO bodega_movimientos (id_producto, tipo, cantidad, stock_final, observacion)
      SELECT 1, 'ENTRADA', 1, n, 'Movimiento ' || n FROM generate_series(1, 52) n;
    INSERT INTO camioneta_movimientos (id_camioneta, id_producto, id_bodeguero, id_repartidor, id_movimiento_bodega, cantidad, stock_final, observacion)
      SELECT 1, 1, 1, 2, n, 1, n, 'Entrega ' || n FROM generate_series(1, 52) n;
    INSERT INTO conteos (id_producto, id_responsable, stock_esperado, stock_fisico, observacion)
      SELECT 1, 1, 30, 30, 'Conteo central ' || n FROM generate_series(1, 52) n;
    INSERT INTO conteos (id_camioneta, id_producto, id_responsable, stock_esperado, stock_fisico, observacion)
      SELECT 1, 1, 2, 10, 10, 'Conteo camioneta ' || n FROM generate_series(1, 52) n;
  `);
  for (const path of ['/admin/bodega', '/admin/camionetas/1/inventario']) {
    await page.goto(path);
    await expect(page.getByRole('button', { name: 'Cargar más', exact: true })).toHaveCount(2);
    for (const table of [page.getByRole('table').nth(1), page.getByRole('table').nth(2)]) {
      await expect(table.locator('tbody tr')).toHaveCount(25);
    }
    await page.getByRole('button', { name: 'Cargar más', exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Cargar más', exact: true })).toHaveCount(1);
    await page.getByRole('button', { name: 'Cargar más', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Cargar más', exact: true })).toHaveCount(0);
    for (const region of [page.getByRole('region').nth(1), page.getByRole('region').nth(2)]) {
      const observations = [];
      for (const count of [25, 25, 2]) {
        await expect(region.locator('tbody tr')).toHaveCount(count);
        observations.push(...await region.locator('tbody tr td:last-child').allTextContents());
        if (count === 25) await region.getByRole('button', { name: 'Página siguiente', exact: true }).click();
      }
      await expect(region.getByRole('button', { name: 'Página siguiente', exact: true })).toBeDisabled();
      expect(new Set(observations).size).toBe(52);
    }
  }
});
