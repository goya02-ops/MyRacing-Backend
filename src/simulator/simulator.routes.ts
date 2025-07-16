// src/simulator/simulator.routes.ts
import { Router } from 'express' // <-- ¡IMPORTANTE: DEBE SER DE 'express' (no 'router')!
import { RequestContext } from '@mikro-orm/core' // Importa RequestContext
import { orm } from '../shared/orm.js' // Importa la instancia 'orm'

import {
  createSimulator,
  getSimulators,
  getSimulatorById,
  updateSimulator,
  deleteSimulator
} from './simulator.controller.js'

export const simulatorRouter = Router() // <-- Usa Router() que importaste de 'express'

// Middleware de RequestContext para este router:
// Esto asegura que el EntityManager esté disponible para todas las rutas definidas en este router.
simulatorRouter.use((req, res, next) => RequestContext.create(orm.em.fork(), next))
// NOTA: Usamos orm.em.fork() para obtener un EntityManager fresco para cada solicitud,
// lo cual es una buena práctica en MikroORM.

// Rutas para la entidad Simulator
simulatorRouter.post('/', createSimulator)
simulatorRouter.get('/', getSimulators)
simulatorRouter.get('/:id', getSimulatorById)
simulatorRouter.put('/:id', updateSimulator)
simulatorRouter.delete('/:id', deleteSimulator)