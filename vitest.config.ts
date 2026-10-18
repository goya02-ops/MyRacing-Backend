import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    setupFiles: ['./src/test/setup.ts'],
    // Allowlist de CORS determinista en local y CI, sin depender del .env.
    env: {
      CORS_ALLOWED_ORIGINS:
        'http://localhost:5173,https://my-racing-frontend-git-*.vercel.app',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*.{test,spec}.ts', 'src/test/**'],
      // Gate de producción: cobertura TOTAL ≥80%.
      // Solo se evalúa cuando corre con --coverage (pnpm test:coverage),
      // que el CI ejecuta únicamente en PRs/pushes a main. En develop
      // corre pnpm test y no bloquea.
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
