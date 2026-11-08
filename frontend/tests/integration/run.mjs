import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { setTimeout } from 'node:timers/promises';

const requireBackend = createRequire(new URL('../../../backend/package.json', import.meta.url));
const { Client } = requireBackend('pg');
const frontend = fileURLToPath(new URL('../../', import.meta.url));
const migrations = new URL('../../../backend/db/migrations/', import.meta.url);
const container = `mussa-integration-${randomUUID()}`;
const password = randomUUID();
let tests;
let client;

function docker(...args) {
  const result = spawnSync('docker', args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || 'Docker no está disponible. Inicia Docker Desktop.');
  return result.stdout.trim();
}

try {
  console.log('Iniciando PostgreSQL temporal (sin volúmenes ni datos de la aplicación)...');
  docker('run', '--detach', '--rm', '--name', container,
    '-e', 'POSTGRES_DB=mussa_integration', '-e', 'POSTGRES_USER=mussa_test',
    '-e', `POSTGRES_PASSWORD=${password}`, '-p', '127.0.0.1::5432', 'postgres:16');
  const address = docker('port', container, '5432/tcp');
  const port = address.split(':').at(-1);
  const connectionString = `postgresql://mussa_test:${password}@127.0.0.1:${port}/mussa_integration`;
  const deadline = Date.now() + 30_000;
  while (true) {
    client = new Client({ connectionString, connectionTimeoutMillis: 1000 });
    try {
      await client.connect();
      break;
    } catch (error) {
      await client.end();
      client = undefined;
      if (Date.now() >= deadline) throw error;
      await setTimeout(250);
    }
  }
  for (const name of (await readdir(migrations)).filter(name => name.endsWith('.sql')).sort()) {
    await client.query(await readFile(new URL(name, migrations), 'utf8'));
  }
  await client.end();
  client = undefined;

  const env = { ...process.env, MUSSA_TEST_DATABASE_URL: connectionString };
  // En Windows puede usarse Edge instalado, sin descargar otro navegador.
  if (!env.PLAYWRIGHT_CHANNEL && process.platform === 'win32'
    && existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')) {
    env.PLAYWRIGHT_CHANNEL = 'msedge';
  }
  tests = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], {
    cwd: frontend, env, stdio: 'inherit',
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => tests.kill(signal));
  }
  process.exitCode = await new Promise((resolve, reject) => {
    tests.once('error', reject);
    tests.once('exit', code => resolve(code ?? 1));
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (client) await client.end();
  const cleanup = spawnSync('docker', ['rm', '--force', container], { encoding: 'utf8' });
  if (cleanup.status !== 0 && !cleanup.stderr?.includes('No such container')) {
    console.error(`No se pudo eliminar el contenedor temporal ${container}: ${cleanup.stderr || cleanup.error}`);
    process.exitCode = 1;
  }
}
