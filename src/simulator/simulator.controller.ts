// src/simulator/simulator.controller.ts
import { Request, Response } from 'express'
// IMPORTANTE: Añadimos 'RequiredEntityData' aquí
import { EntityManager, RequiredEntityData } from '@mikro-orm/core'
import { Simulator } from './simulator.entity.js' // Importa tu entidad Simulator

// Función auxiliar para obtener el EntityManager del RequestContext
// Es crucial para acceder a orm.em dentro de los controladores
const getEntityManager = (req: Request): EntityManager => {
  // AÑADIDO PARA DEPURACIÓN: Verifica si (req as any).em está definido al recuperarlo
  console.log('DEBUG: (req as any).em dentro de getEntityManager:', (req as any).em ? 'definido' : 'UNDEFINED');
  return (req as any).em;
};


// Controlador para crear un nuevo simulador (POST /api/simulators)
export const createSimulator = async (req: Request, res: Response) => {
  try {
    const em = getEntityManager(req); // Obtén el EntityManager
    const { description } = req.body; // Obtén la descripción del cuerpo de la solicitud

    // Verifica que la descripción no esté vacía
    if (!description) {
      return res.status(400).json({ message: 'La descripción es obligatoria' });
    }

    // Crea una nueva instancia de Simulator.
    // Usamos 'as RequiredEntityData<Simulator, 'id_simulator'>' para indicar a TypeScript
    // que esperamos que el 'id_simulator' sea opcional para la creación
    // porque es auto-generado por la base de datos (según tu entidad).
    const newSimulator = em.create(Simulator, {
      description,
      // No incluimos 'id_simulator' aquí porque es auto-incrementable y la DB lo gestiona.
      // Si TypeScript sigue quejándose, puedes poner 'id_simulator: undefined' como último recurso,
      // pero con la configuración correcta de la entidad, no debería ser necesario.
    } as RequiredEntityData<Simulator, 'id_simulator'>);


    // Persiste la nueva instancia en la base de datos
    await em.persistAndFlush(newSimulator);

    // Envía la respuesta con el simulador creado y un estado 201 (Created)
    return res.status(201).json(newSimulator);

  } catch (error: any) {
    // Manejo de errores
    console.error('Error al crear simulador:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};

// Controlador para obtener todos los simuladores (GET /api/simulators)
export const getSimulators = async (req: Request, res: Response) => {
  try {
    const em = getEntityManager(req); // Obtén el EntityManager
    const simulators = await em.find(Simulator, {}); // Encuentra todos los simuladores

    // Envía la lista de simuladores
    return res.status(200).json(simulators);

  } catch (error: any) {
    console.error('Error al obtener simuladores:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};

// Controlador para obtener un simulador por ID (GET /api/simulators/:id)
export const getSimulatorById = async (req: Request, res: Response) => {
  try {
    const em = getEntityManager(req); // Obtén el EntityManager
    const id_simulator = parseInt(req.params.id); // Obtén el ID de los parámetros de la ruta

    // Busca un simulador por su ID
    const simulator = await em.findOne(Simulator, { id_simulator });

    // Si no se encuentra el simulador, envía un 404
    if (!simulator) {
      return res.status(404).json({ message: 'Simulador no encontrado' });
    }

    // Envía el simulador encontrado
    return res.status(200).json(simulator);

  } catch (error: any) {
    console.error('Error al obtener simulador por ID:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};

// Controlador para actualizar un simulador (PUT /api/simulators/:id)
export const updateSimulator = async (req: Request, res: Response) => {
  try {
    const em = getEntityManager(req); // Obtén el EntityManager
    const id_simulator = parseInt(req.params.id); // Obtén el ID
    const { description } = req.body; // Obtén la nueva descripción

    // Busca el simulador por su ID
    const simulator = await em.findOne(Simulator, { id_simulator });

    // Si no se encuentra, envía un 404
    if (!simulator) {
      return res.status(404).json({ message: 'Simulador no encontrado' });
    }

    // Verifica que la descripción no esté vacía para la actualización
    if (!description) {
        return res.status(400).json({ message: 'La descripción es obligatoria para la actualización' });
    }

    // Actualiza la descripción
    simulator.description = description;

    // Persiste los cambios en la base de datos
    await em.persistAndFlush(simulator);

    // Envía la respuesta con el simulador actualizado
    return res.status(200).json(simulator);

  } catch (error: any) {
    console.error('Error al actualizar simulador:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};

// Controlador para eliminar un simulador (DELETE /api/simulators/:id)
export const deleteSimulator = async (req: Request, res: Response) => {
  try {
    const em = getEntityManager(req); // Obtén el EntityManager
    const id_simulator = parseInt(req.params.id); // Obtén el ID

    // Busca el simulador por su ID
    const simulator = await em.findOne(Simulator, { id_simulator });

    // Si no se encuentra, envía un 404
    if (!simulator) {
      return res.status(404).json({ message: 'Simulador no encontrado' });
    }

    // Elimina el simulador
    await em.removeAndFlush(simulator);

    // Envía una respuesta de éxito sin contenido (204 No Content)
    return res.status(204).send();

  } catch (error: any) {
    console.error('Error al eliminar simulador:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};