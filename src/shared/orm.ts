import { MikroORM } from '@mikro-orm/mysql';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } from './config.js';

export const orm = await MikroORM.init({
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  dbName: 'myracing',
  clientUrl: `mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
  highlighter: new SqlHighlighter(),
  debug: false,
  schemaGenerator: {
    // never in production
    disableForeignKeys: true,
    createForeignKeyConstraints: true,
    ignoreSchema: [],
  },
});

export const syncSchema = async () => {
  const generator = orm.getSchemaGenerator();

  /*
  await generator.dropSchema();
  await generator.createSchema();
  */

  await generator.updateSchema();
};
