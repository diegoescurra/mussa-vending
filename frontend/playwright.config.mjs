import { defineConfig } from '@playwright/test';

if (!process.env.MUSSA_TEST_DATABASE_URL) {
  throw new Error('Ejecuta pnpm test:integration para crear una base de datos aislada.');
}

export default defineConfig({
  testDir: './tests/integration',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node ../backend/node_modules/tsx/dist/cli.mjs ../backend/src/server.ts',
      url: 'http://127.0.0.1:3011/health',
      reuseExistingServer: false,
      env: {
        DATABASE_URL: process.env.MUSSA_TEST_DATABASE_URL,
        DB_SSL: 'false',
        PORT: '3011',
        CORS_ORIGIN: 'http://127.0.0.1:4173',
        SESSION_SECRET: 'isolated-integration-session-secret-for-tests-only',
        NODE_ENV: 'test',
        SESSION_SAME_SITE: 'lax',
        TRUST_PROXY: '0',
      },
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      env: { VITE_API_URL: 'http://127.0.0.1:3011/api' },
    },
  ],
});
