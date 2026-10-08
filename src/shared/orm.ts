import { MikroORM } from '@mikro-orm/mysql';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';
import { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } from './config.js';

import { Category } from '../category/category.entity.js';
import { CategoryVersion } from '../category-version/category-version.entity.js';
import { Circuit } from '../circuit/circuit.entity.js';
import { CircuitVersion } from '../circuit-version/circuit-version.entity.js';
import { Combination } from '../combination/combination.entity.js';
import { Membership } from '../membership/membership.entity.js';
import { Race } from '../race/race.entity.js';
import { RaceUser } from '../race-user/race-user.entity.js';
import { Simulator } from '../simulator/simulator.entity.js';
import { User } from '../user/user.entity.js';

export const orm = await MikroORM.init({
  entities: [
    Category,
    CategoryVersion,
    Circuit,
    CircuitVersion,
    Combination,
    Membership,
    Race,
    RaceUser,
    Simulator,
    User,
  ],
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
