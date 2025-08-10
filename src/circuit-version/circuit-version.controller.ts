import { Request, Response, NextFunction } from "express";
import { CircuitVersion } from "./circuit-version.entity.js";
import { orm } from "../shared/orm.js";


function sanitizeCircuitVersionInput(req: Request, res: Response, next: NextFunction){

  req.body.sanitizeInput = {
    status: req.body.status,
    circuit: req.body.circuit,
    simulator: req.body.simulator
  };

  Object.keys(req.body.sanitizeInput).forEach((key) => {
    if (req.body.sanitizeInput[key] === undefined) delete req.body.sanitizeInput[key];
  });

  next();
}


async function findAll(req: Request, res: Response) {
  try {
    const em = orm.em;
    const circuitVersions = await em.find(CircuitVersion, {},{
      populate: ['circuit', 'simulator']
    });
    res.status(200).json({message: "Find all circuit_versions classes", data: circuitVersions});
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id)
    const circuitVersion = await em.findOneOrFail(CircuitVersion, { id }, {
      populate: ['circuit', 'simulator']
    });
    res.status(200).json({message: "Circuit_Version found: ", data: circuitVersion})
  } catch (error: any) {
    res.status(500).json({ data: error.message })
  }
}

async function add(req: Request, res: Response) {
  try{
    const em = orm.em;
    const circuitVersion = em.create(CircuitVersion, req.body);
    await em.flush();
    res.status(201).json({ message: "CircuitVersion class created", data: circuitVersion});
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const circuitVersion = await em.findOneOrFail(CircuitVersion, { id });
    em.assign(circuitVersion, req.body.sanitizeInput);
    await em.flush();
    res.status(200).json({ message: "Circuit_Version updated", data: circuitVersion });
  } catch (error:any) {
    res.status(500).json({ data: error.message });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const circuitVersion = em.getReference(CircuitVersion, id);
    await em.removeAndFlush(circuitVersion);
    res.status(200).json({ message: "CircuitVersion class deleted", data: circuitVersion });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

export const CircuitVersionController = {
  sanitizeCircuitVersionInput,
  findAll,
  findOne,
  add,
  update,
  remove
};