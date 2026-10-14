import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Caracterización de secretos de CI:
// el job `test` no debe hardcodear passwords MySQL en el yaml.
// GitHub rechaza `${{ secrets.* }}` dentro de `jobs.*.services`,
// así que MySQL se levanta en un step con `docker run -d`
// (en steps los secrets sí funcionan). Sonar S7636 prohíbe
// expandir secrets en bloques `run:`: van por `env:` del step
// y en el script se usa `$VAR` (con `run:` ANTES que `env:`).
// Se aserta sobre el fuente porque es config de CI, no testeable
// importando el módulo (mismo patrón que ci-gate.test.ts).
// Solo lee el yaml con `readFileSync`: no importa código de app
// (`src/shared/orm.ts` conecta a MySQL al importar).
const ciYml = readFileSync(
  new URL('../../.github/workflows/ci.yml', import.meta.url),
  'utf-8',
);

describe('CI secrets', () => {
  it('el job `test` no usa bloque `services:` con mysql', () => {
    expect(ciYml).not.toMatch(/services:\s*\n\s*mysql:/);
    expect(ciYml).not.toContain('services:');
  });

  it('MySQL se levanta con `docker run` y secrets (MYSQL_ROOT_PASSWORD y DB_PASSWORD)', () => {
    expect(ciYml).toMatch(/docker run[\s\S]*secrets\.MYSQL_ROOT_PASSWORD/);
    expect(ciYml).toMatch(/docker run[\s\S]*secrets\.DB_PASSWORD/);
  });

  it('el step de MySQL declara `run:` ANTES que `env:`', () => {
    const dockerIdx = ciYml.indexOf('docker run');
    expect(dockerIdx).toBeGreaterThan(-1);
    const runIdx = ciYml.lastIndexOf('run:', dockerIdx);
    const envIdx = ciYml.indexOf('env:', dockerIdx);
    expect(runIdx).toBeGreaterThan(-1);
    expect(envIdx).toBeGreaterThan(runIdx);
  });

  it('los secrets solo se expanden en líneas `env:` (`VAR: ${{ secrets.X }}`), nunca en `run:`', () => {
    const secretLines = ciYml
      .split('\n')
      .filter((line) => line.includes('secrets.'));
    expect(secretLines.length).toBeGreaterThan(0);
    for (const line of secretLines) {
      expect(line).toMatch(/^\s*\w+:\s*\$\{\{\s*secrets\./);
    }
  });

  it('toda línea `DB_PASSWORD:` usa `${{ secrets.DB_PASSWORD }}`', () => {
    const dbPasswordLines = ciYml
      .split('\n')
      .filter((line) => line.includes('DB_PASSWORD:'));
    expect(dbPasswordLines.length).toBeGreaterThan(0);
    for (const line of dbPasswordLines) {
      expect(line).toContain('${{ secrets.DB_PASSWORD }}');
    }
  });

  it('no hay passwords MySQL hardcodeadas en el yaml', () => {
    expect(ciYml).not.toContain('MiR@cing_2025!');
    expect(ciYml).not.toContain('root_password_segura');
  });

  it('los placeholders de CI no secretos se mantienen (`JWT_*`/`MERCADOPAGO_ACCESS_TOKEN` con `ci_*`)', () => {
    expect(ciYml).toContain('JWT_SECRET: ci_secret_for_tests');
    expect(ciYml).toContain('JWT_REFRESH_SECRET: ci_refresh_secret_for_tests');
    expect(ciYml).toContain('MERCADOPAGO_ACCESS_TOKEN: ci_mp_token_for_tests');
  });
});
