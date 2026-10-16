import { orm } from '../shared/orm.js';

// BE-12: el esquema se sincroniza una sola vez y de forma segura entre los
// workers de Vitest. Sin serialización, varios archivos ejecutan
// ensureDatabase/updateSchema en paralelo sobre la DB vacía de CI y el DDL
// compite (TableNotFoundException: las tablas aún no existen cuando corre un
// test). GET_LOCK de MySQL serializa la sección crítica: un worker hace el DDL
// y los demás esperan y luego lo repiten como no-op.
const SCHEMA_LOCK = 'myracing_schema_sync';
const LOCK_TIMEOUT_SECONDS = 60;

const generator = orm.getSchemaGenerator();
await generator.ensureDatabase();

const connection = orm.em.getConnection();
await connection.execute('SELECT GET_LOCK(?, ?)', [
  SCHEMA_LOCK,
  LOCK_TIMEOUT_SECONDS,
]);
try {
  await generator.updateSchema();
} finally {
  await connection.execute('SELECT RELEASE_LOCK(?)', [SCHEMA_LOCK]);
}
