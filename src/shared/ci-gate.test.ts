import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Caracterización del gate de CI (issue #3): el CI debe correr tests
// reales (`pnpm test`, sin `--if-present`) y la config de vitest debe
// fijar `coverage.thresholds` ≥80. Se aserta sobre los fuentes porque son
// config de CI/build, no testeables importando el módulo (ver AGENTS.md).
const ciYml = readFileSync(
  new URL('../../.github/workflows/ci.yml', import.meta.url),
  'utf-8',
);
const vitestConfig = readFileSync(
  new URL('../../vitest.config.ts', import.meta.url),
  'utf-8',
);
const packageJson = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'),
) as { scripts?: Record<string, string> };

describe('CI gate', () => {
  it('el job Tests corre `pnpm test` sin `--if-present`', () => {
    expect(ciYml).toMatch(/run:\s*pnpm test\s*$/m);
    expect(ciYml).not.toContain('--if-present');
  });

  it('el script `test` ejecuta vitest real, no un placeholder `echo`', () => {
    expect(packageJson.scripts?.test ?? '').toContain('vitest');
    expect(packageJson.scripts?.test ?? '').not.toContain('echo');
  });

  it('la config de vitest fija coverage.thresholds ≥80', () => {
    for (const key of ['lines', 'functions', 'branches', 'statements']) {
      const match = vitestConfig.match(new RegExp(`${key}:\\s*(\\d+)`));
      expect(match?.[1], `threshold ${key}`).toBeDefined();
      expect(Number(match?.[1])).toBeGreaterThanOrEqual(80);
    }
  });

  it('el job Tests expone DB_NAME y MERCADOPAGO_ACCESS_TOKEN', () => {
    expect(ciYml).toMatch(/DB_NAME:\s*myracing/);
    expect(ciYml).toContain('MERCADOPAGO_ACCESS_TOKEN');
  });

  it('el nombre del step de tests no dice que se saltea la suite', () => {
    expect(ciYml).not.toMatch(/skips until test suite/i);
  });
});
