import { Request, Response, NextFunction } from "express";
import { Circuit_version } from "./circuit_version.entity.js";
import { orm } from "../shared/orm.js";


function sanitizeCircuit_VersionInput(req: Request, res: Response, next: NextFunction){

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
    const circuit_versions = await em.find(Circuit_version, {},{
      populate: ['circuit', 'simulator']
    });
    res.status(200).json({message: "Find all circuit_versions classes", data: circuit_versions});
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id)
    const circuit_version = await em.findOneOrFail(Circuit_version, { id }, {
      populate: ['circuit', 'simulator']
    });
    res.status(200).json({message: "Circuit_Version found: ", data: circuit_version})
  } catch (error: any) {
    res.status(500).json({ data: error.message })
  }
}

async function add(req: Request, res: Response) {
  try{
    const em = orm.em;
    const circuit_version = em.create(Circuit_version, req.body);
    await em.flush();
    res.status(201).json({ message: "Circuit_Version class created", data: circuit_version});
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const circuit_version = await em.findOneOrFail(Circuit_version, { id });
    em.assign(circuit_version, req.body.sanitizeInput);
    await em.flush();
    res.status(200).json({ message: "Circuit_Version updated", data: circuit_version });
  } catch (error:any) {
    res.status(500).json({ data: error.message });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const circuit_version = em.getReference(Circuit_version, id);
    await em.removeAndFlush(circuit_version);
    res.status(200).json({ message: "Circuit_Version class deleted", data: circuit_version });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

export const Circuit_versionController = {
  sanitizeCircuit_VersionInput,
  findAll,
  findOne,
  add,
  update,
  remove
};