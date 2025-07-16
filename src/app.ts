// src/app.ts
import 'reflect-metadata/Reflect.js' // Importante: debe estar al principio para MikroORM y TypeScript
import express from 'express'
import { RequestContext } from '@mikro-orm/core'
import { orm } from './shared/orm.js' // Importa la instancia 'orm' desde el archivo que ya configuramos

// Importa tus routers aquí para las diferentes entidades
import { categoryRouter } from './category/category.routes.js'
import { simulatorRouter } from './simulator/simulator.routes.js'

const app = express()
const port = 3000 // Puerto en el que se ejecutará tu servidor Express

// Middleware para parsear el cuerpo de las solicitudes JSON
app.use(express.json())

// AÑADIDO PARA DEPURACIÓN: Verifica si orm.em está definido ANTES de usarlo en el RequestContext
console.log('DEBUG: orm.em antes de RequestContext:', orm.em ? 'definido' : 'UNDEFINED');


// Configuración de las rutas base para tus APIs
// Todas las rutas definidas en categoryRouter se accederán a través de /api/categories
app.use('/api/categories', categoryRouter)
// Todas las rutas definidas en simulatorRouter se accederán a través de /api/simulators
app.use('/api/simulators', simulatorRouter)


// Función asíncrona para inicializar la aplicación
// Esto es importante porque la inicialización de MikroORM es asíncrona
async function init() {
  try {
    // MikroORM.init ya se ejecuta al exportar 'orm' en 'shared/orm.ts' (gracias a 'await')
    // por lo que no necesitas orm.connect() aquí. La conexión ya estará lista.

    // Sincronizar el esquema de la base de datos con tus entidades definidas en MikroORM.
    // Esto creará las tablas (Category, Simulator) si no existen o las actualizará.
    // Utiliza 'updateSchema()' para cambios incrementales. Puedes usar '.sync()' para una sincronización
    // más completa que puede ser destructiva (ej. borrar columnas que ya no están en tu entidad).
    await orm.getSchemaGenerator().updateSchema()
    console.log('✅ Esquema de la base de datos sincronizado correctamente.')

    // Iniciar el servidor Express después de que la base de datos esté lista
    app.listen(port, () => {
      console.log(`🚀 Servidor Express ejecutándose en http://localhost:${port}`)
      console.log('Pulsa Ctrl-C para detener el servidor.')
    })
  } catch (error) {
    // Si ocurre un error durante la inicialización (ej. problema de conexión a DB), lo mostramos y salimos
    console.error('❌ Error al inicializar la aplicación:', error)
    process.exit(1) // Terminar el proceso con un código de error
  }
}

// Llama a la función de inicialización para arrancar la aplicación
init()