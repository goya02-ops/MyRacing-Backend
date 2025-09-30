import { Request, Response, NextFunction } from 'express';
import { Circuit } from './circuit.entity.js';
import { orm } from '../shared/orm.js';

function sanitizeCircuitInput(req: Request, res: Response, next: NextFunction) {
  req.body.sanitizeInput = {
    denomination: req.body.denomination,
    description: req.body.description,
    abbreviation: req.body.abbreviation,
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
    const circuits = await em.find(
      Circuit,
      {},
      { populate: ['circuitVersions'] }
    );
    res
      .status(200)
      .json({ message: 'Find all circuits classes', data: circuits });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const circuit = await em.findOneOrFail(
      Circuit,
      { id },
      { populate: ['circuitVersions'] }
    );
    res.status(200).json({ message: 'Circuit found: ', data: circuit });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function add(req: Request, res: Response) {
  try {
    const em = orm.em;
    const circuit = em.create(Circuit, req.body);
    await em.flush();
    res.status(201).json({ message: 'Circuit class created', data: circuit });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const circuit = await em.findOneOrFail(Circuit, { id });
    em.assign(circuit, req.body.sanitizeInput);
    await em.flush();
    res.status(200).json({ message: 'Circuit class updated', data: circuit });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const circuit = await em.findOneOrFail(Circuit, { id });
    await em.removeAndFlush(circuit);
    res.status(200).json({ message: 'Circuit class deleted', data: circuit });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

export const CircuitController = {
  sanitizeCircuitInput,
  findAll,
  findOne,
  add,
  update,
  remove,
};
