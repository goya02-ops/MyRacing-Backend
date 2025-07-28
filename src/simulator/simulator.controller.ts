
import { Request, Response, NextFunction } from "express";
import { EntityManager, RequiredEntityData } from '@mikro-orm/core';
import { Simulator } from "./simulator.entity.js";


const getEntityManager = (req: Request): EntityManager => (req as any).em;


function sanitizeSimulatorInput(req: Request, res: Response, next: NextFunction){
  req.body.sanitizeInput = {
    description: req.body.description,
  };

  Object.keys(req.body.sanitizeInput).forEach((key) => {
    if (req.body.sanitizeInput[key] === undefined) delete req.body.sanitizeInput[key];
  });

  next();
}


async function getAllSimulators(req: Request, res: Response) {
  try {
    const em = getEntityManager(req);
    const simulators = await em.find(Simulator, {});
    res.status(200).json({message: "Lista de simuladores obtenida", data: simulators});
  } catch (error: any) {
    console.error('Error al obtener todos los simuladores:', error);
    res.status(500).json({ data: error.message });
  }
}


async function getOneSimulator(req: Request, res: Response) {
  try {
    const em = getEntityManager(req);
    const id_simulator = Number.parseInt(req.params.id);
    const simulator = await em.findOneOrFail(Simulator,{ id_simulator });
    res.status(200).json({message: "Simulador encontrado: ", data: simulator});
  } catch (error: any) {
    console.error('Error al obtener un simulador por ID:', error);
    if (error.name === 'NotFoundError') {
      res.status(404).json({ message: 'Simulador no encontrado' });
    } else {
      res.status(500).json({ data: error.message });
    }
  }
}


async function addSimulator(req: Request, res: Response) {
  try{
    const em = getEntityManager(req);
    const simulator = em.create(Simulator, req.body.sanitizeInput as RequiredEntityData<Simulator, 'id_simulator'>);
    await em.flush();
    res.status(201).json({ message: "Simulador creado exitosamente", data: simulator });
  } catch (error: any) {
    console.error('Error al añadir simulador:', error);
    res.status(500).json({ data: error.message });
  }
}


async function updateSimulator(req: Request, res: Response) {
  try {
    const em = getEntityManager(req);
    const id_simulator = Number.parseInt(req.params.id);
    const simulator = await em.findOneOrFail(Simulator, { id_simulator });
    
    em.assign(simulator, req.body.sanitizeInput);
    await em.flush();
    res.status(200).json({ message: "Simulador actualizado exitosamente", data: simulator });
  } catch (error:any) {
    console.error('Error al actualizar simulador:', error);
    if (error.name === 'NotFoundError') {
      res.status(404).json({ message: 'Simulador no encontrado para actualizar' });
    } else {
      res.status(500).json({ data: error.message });
    }
  }
}
async function removeSimulator(req: Request, res: Response) {
  try {
    const em = getEntityManager(req);
    const id_simulator = Number.parseInt(req.params.id);
    const simulator = await em.findOneOrFail(Simulator, { id_simulator });
    await em.removeAndFlush(simulator);
    res.status(200).json({ message: "Simulador eliminado exitosamente", data: simulator });
  } catch (error: any) {
    console.error('Error al eliminar simulador:', error);
    if (error.name === 'NotFoundError') {
      res.status(404).json({ message: 'Simulador no encontrado para eliminar' });
    } else {
      res.status(500).json({ data: error.message });
    }
  }
}


export const SimulatorController = {
  sanitizeSimulatorInput,
  getAllSimulators,
  getOneSimulator,
  addSimulator,
  updateSimulator,
  removeSimulator
};