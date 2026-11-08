import { test, expect, apiURL, loginApi, testPassword, reviewReposicion } from './fixtures.mjs';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test.use({ authenticated: false });

test('acceso: login real, cookie de sesión, recarga, CSRF y cierre con revocación', async ({ page, context, request, db }, testInfo) => {
  const schema = await readFile(new URL('../../../backend/db/schema.sql', import.meta.url), 'utf8');
  await db.query(schema);
  await db.query(schema); // El esquema consolidado conserva los datos al repetirse.
  execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'src/auth/create-admin.ts'], {
    cwd: fileURLToPath(new URL('../../../backend/', import.meta.url)),
    env: { ...process.env, DATABASE_URL: process.env.MUSSA_TEST_DATABASE_URL, DB_SSL: 'false', ADMIN_EMAIL: 'ana@test.invalid', ADMIN_PASSWORD: testPassword },
    stdio: 'pipe', timeout: 15_000,
  });
  expect((await request.get(`${apiURL}/productos`)).status()).toBe(401);
  expect((await request.post(`${apiURL}/auth/login`, { data: { email: 'ana@test.invalid', password: testPassword } })).status()).toBe(403);
  await page.goto('/admin/productos');
  await expect(page).toHaveURL(/\/login$/);
  await page.screenshot({ path: testInfo.outputPath('login-desktop.png') });
  const anonymousCookie = (await context.cookies(apiURL)).find(cookie => cookie.name === 'mussa.sid');
  await page.getByLabel('Correo electrónico').fill(' ANA@TEST.INVALID ');
  await page.getByLabel('Contraseña', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.');
  await page.getByLabel('Contraseña', { exact: true }).fill(testPassword);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  const cookie = (await context.cookies(apiURL)).find(cookie => cookie.name === 'mussa.sid');
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe('Lax');
  expect(cookie.value).not.toBe(anonymousCookie?.value);
  const user = (await (await context.request.get(`${apiURL}/auth/session`)).json()).data.user;
  expect(user).not.toHaveProperty('password_hash');
  expect(user).not.toHaveProperty('auth_version');
  expect((await db.query("SELECT count(*)::int AS n FROM sesiones WHERE sess->'passport'->'user'->>'id' = '1'")).rows[0].n).toBe(1);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Resumen operativo', exact: true })).toBeVisible();
  expect((await context.request.post(`${apiURL}/productos`, { data: { nombre: 'CSRF' } })).status()).toBe(403);
  await page.getByRole('button', { name: 'Salir', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await request.get(`${apiURL}/usuarios`, { headers: { Cookie: `mussa.sid=${cookie.value}` } })).status()).toBe(401);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('login-mobile.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('permisos: el reponedor no administra, solo ve su camioneta y no suplanta otra identidad', async ({ page, context, db }) => {
  await db.query(`
    INSERT INTO usuarios (nombre, apellido, email, password_hash, rol) VALUES ('Otro', 'Chofer', 'otro@test.invalid', 'pendiente', 'REPONEDOR');
    INSERT INTO camionetas (patente, nombre, id_repartidor) VALUES ('TEST02', 'Otra camioneta', 3);
  `);
  const token = await loginApi(context.request, 'luis@test.invalid');
  for (const path of ['/usuarios', '/productos', '/proveedores', '/bodega', '/dashboard', '/camionetas/2/inventario']) {
    expect((await context.request.get(apiURL + path)).status(), path).toBe(403);
  }
  const trucks = (await (await context.request.get(`${apiURL}/camionetas`)).json()).data;
  expect(trucks.map(truck => truck.id_camioneta)).toEqual([1]);
  expect((await context.request.post(`${apiURL}/usuarios`, { headers: { 'X-CSRF-Token': token }, data: { rol: 'ADMIN' } })).status()).toBe(403);
  await page.goto('/admin/productos');
  await expect(page).toHaveURL(/\/reposicion$/);
  await reviewReposicion(page);
  await expect(page.getByRole('combobox', { name: 'Reponedor', exact: true })).toHaveCount(0);
  await page.route(`${apiURL}/reposiciones`, route => route.continue({ postData: JSON.stringify({ ...route.request().postDataJSON(), id_repartidor: 3 }) }));
  await page.getByRole('button', { name: 'Finalizar reposición', exact: true }).click();
  await expect(page.getByText('Reposición enviada correctamente.', { exact: true })).toBeVisible();
  expect((await db.query('SELECT id_repartidor FROM reposiciones')).rows[0].id_repartidor).toBe(2);
  expect((await db.query('SELECT id_repartidor FROM camioneta_movimientos')).rows[0].id_repartidor).toBe(2);
});

test('cuentas: cambiar contraseña revoca sesiones; desactivar o cambiar rol revoca el acceso anterior', async ({ page, context, request, db }) => {
  const adminToken = await loginApi(request);
  const headers = { 'X-CSRF-Token': adminToken };
  expect((await request.put(`${apiURL}/usuarios/2`, { headers, data: { password_hash: 'forged' } })).status()).toBe(400);
  await loginApi(context.request, 'luis@test.invalid');
  await page.goto('/reposicion');
  await page.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click();
  await page.getByLabel('Contraseña actual', { exact: true }).fill(testPassword);
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('Nueva-password-test-123');
  await page.getByLabel('Repetir nueva contraseña').fill('Nueva-password-test-123');
  await page.getByRole('dialog').getByRole('button', { name: 'Cambiar contraseña', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  const saved = (await db.query('SELECT password_hash, auth_version FROM usuarios WHERE id_usuario = 2')).rows[0];
  expect(saved.password_hash).toMatch(/^\$2b\$12\$/);
  expect(saved.auth_version).toBe(2);
  const anonymous = (await (await context.request.get(`${apiURL}/auth/session`)).json()).data;
  expect((await context.request.post(`${apiURL}/auth/login`, { headers: { 'X-CSRF-Token': anonymous.csrfToken }, data: { email: 'luis@test.invalid', password: testPassword } })).status()).toBe(401);
  await loginApi(context.request, 'luis@test.invalid', 'Nueva-password-test-123');
  expect((await request.put(`${apiURL}/usuarios/2`, { headers, data: { estado: false } })).status()).toBe(200);
  expect((await context.request.get(`${apiURL}/camionetas`)).status()).toBe(401);
  const inactive = (await (await context.request.get(`${apiURL}/auth/session`)).json()).data;
  expect((await context.request.post(`${apiURL}/auth/login`, { headers: { 'X-CSRF-Token': inactive.csrfToken }, data: { email: 'luis@test.invalid', password: 'Nueva-password-test-123' } })).status()).toBe(401);
  expect((await request.put(`${apiURL}/usuarios/2`, { headers, data: { estado: true } })).status()).toBe(200);
  await loginApi(context.request, 'luis@test.invalid', 'Nueva-password-test-123');
  expect((await request.put(`${apiURL}/usuarios/2`, { headers, data: { rol: 'ADMIN' } })).status()).toBe(200);
  expect((await context.request.get(`${apiURL}/productos`)).status()).toBe(401);
  await loginApi(context.request, 'luis@test.invalid', 'Nueva-password-test-123');
  expect((await context.request.get(`${apiURL}/productos`)).status()).toBe(200);
  expect((await request.put(`${apiURL}/usuarios/1`, { headers, data: { estado: false } })).status()).toBe(400);
});
