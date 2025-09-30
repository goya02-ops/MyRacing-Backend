import { Request, Response, NextFunction } from 'express';
import { Simulator } from './simulator.entity.js';
import { orm } from '../shared/orm.js';

function sanitizeSimulatorInput(
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.body.sanitizeInput = {
    name: req.body.name,
    status: req.body.status,
  };

  Object.keys(req.body.sanitizeInput).forEach((key) => {
    if (req.body.sanitizeInput[key] === undefined)
      delete req.body.sanitizeInput[key];
  });

  next();
}

async function findAll(req: Request, res: Response) {
  try {
    const em = orm.em;
    const simulators = await em.find(Simulator, {});
    res
      .status(200)
      .json({ message: 'Find all categories classes', data: simulators });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const simulator = await em.findOneOrFail(Simulator, { id });
    res.status(200).json({ message: 'Simulator found: ', data: simulator });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function add(req: Request, res: Response) {
  try {
    const em = orm.em;
    const simulator = em.create(Simulator, req.body);
    await em.flush();
    res.status(201).json({ message: 'Simulator created', data: simulator });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const simulator = await em.findOneOrFail(Simulator, { id });
    em.assign(simulator, req.body.sanitizeInput);
    await em.flush();
    res.status(200).json({ message: 'Simulator updated', data: simulator });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}
async function remove(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const simulator = await em.findOneOrFail(Simulator, { id });
    await em.removeAndFlush(simulator);
    res.status(200).json({ message: 'Simulator deleted', data: simulator });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

export const SimulatorController = {
  sanitizeSimulatorInput,
  findAll,
  findOne,
  add,
  update,
  remove,
};
