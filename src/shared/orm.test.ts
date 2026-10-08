import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// BE-2 (rojo): src/shared/orm.ts hardcodea `dbName: 'myracing'` e ignora
// `DB_NAME`, así que los tests usarían la DB de dev en vez de
// `DB_NAME=myracing_test`. Se aserta sobre el fuente porque importar
// orm.ts conecta a MySQL al evaluarse (top-level await) y no es
// determinístico sin DB viva (ver AGENTS.md).
describe('orm config (BE-2)', () => {
  it('usa DB_NAME del entorno como dbName en vez de hardcodear myracing', () => {
    process.env.DB_NAME = 'myracing_test';
    const source = readFileSync(new URL('./orm.ts', import.meta.url), 'utf-8');
    expect(source).toMatch(/dbName:\s*(DB_NAME|process\.env\.DB_NAME)/);
  });
});
