// src/shared/orm.ts
import { MikroORM } from '@mikro-orm/core'
import { MySqlDriver } from '@mikro-orm/mysql'
import { SqlHighlighter } from '@mikro-orm/sql-highlighter'
import 'reflect-metadata/Reflect.js' // Importante: debe estar al principio para MikroORM y TypeScript

// Configuración de la conexión a la base de datos MySQL usando MikroORM
export const orm = await MikroORM.init<MySqlDriver>({
  // Rutas a tus entidades compiladas (JavaScript)
  entities: ['./dist/**/*.entity.js'],
  // Rutas a tus entidades TypeScript (para desarrollo, MikroORM las observa)
  entitiesTs: ['./src/**/*.entity.ts'],

  // Nombre de la base de datos a la que te conectarás
  dbName: 'heroclash4geeks',

  // Credenciales de conexión a MySQL
  user: 'root',
  password: 'L1$@ndroT3g', // ¡ESTA ES TU CONTRASEÑA REAL DE ROOT EN MYSQL!
                           // Confirmada: L1$@ndroT3g

  // Host y puerto de tu servidor MySQL
  host: 'localhost', // Como MySQL está en tu misma VM, es 'localhost'
  port: 3306,        // Puerto por defecto de MySQL

  // Driver de base de datos a utilizar (para MySQL)
  driver: MySqlDriver,

  // Resaltador SQL para mejor legibilidad en los logs de depuración
  highlighter: new SqlHighlighter(),

  // Habilitar el modo depuración para ver las consultas SQL en la terminal
  debug: true,

  // Estrategia de descubrimiento de entidades (ReflectMetadata es común con TypeScript)
  // Asegúrate de tener "emitDecoratorMetadata": true y "experimentalDecorators": true
  // en tu tsconfig.json
  metadataProvider: undefined, // MikroORM detecta automáticamente ReflectMetadata si está configurado

  // Opciones de migración (si las vas a usar más adelante, puedes descomentar y configurar)
  // migrations: {
  //   tableName: 'mikro_orm_migrations',
  //   path: './src/migrations',
  //   transactional: true,
  //   disableForeignKeys: true,
  //   allOrNothing: true,
  //   dropObjects: false,
  //   safe: true,
  //   emit: 'ts',
  // },

  // Opciones del pool de conexiones (puedes ajustar según necesidades de rendimiento)
  // pool: {
  //   min: 2,
  //   max: 10,
  // },

  // ... otras configuraciones si las necesitas más adelante
})

// Puedes exportar el EntityManager directamente si lo necesitas en app.ts
// export const em = orm.em