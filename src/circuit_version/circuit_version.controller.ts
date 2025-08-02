import { Request, Response, NextFunction } from "express";
import { Circuit_Version } from "./circuit_version.entity.js";
import { orm } from "../shared/orm.js";


function sanitizeCircuit_VersionInput(req: Request, res: Response, next: NextFunction){

  req.body.sanitizeInput = {
    denomination: req.body.denomination,
    description: req.body.description,
    abbreviation: req.body.abbreviation,
    status: req.body.status,
  };

  Object.keys(req.body.sanitizeInput).forEach((key) => {
    if (req.body.sanitizeInput[key] === undefined) delete req.body.sanitizeInput[key];
  });

  next();
}

const em = orm.em.fork(); // create a new isolated EntityManager instance for this request

async function getAll(req: Request, res: Response) {
  try {
    const circuit_versions = await em.find(Circuit_Version, {});
    res.status(200).json({message: "Find all circuit_versions classes", data: circuit_versions});
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function getOne(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id)
    const circuit_version = await em.findOneOrFail(Circuit_Version,{ id })
    res.status(200).json({message: "Circuit_Version found: ", data: circuit_version})
  } catch (error: any) {
    res.status(500).json({ data: error.message })
  }
}

async function add(req: Request, res: Response) {
  try{
    const circuit_version = em.create(Circuit_Version, req.body);
    await em.flush();
    res.status(201).json({ message: "Circuit_Version class created", data: circuit_version});
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const circuit_version = await em.findOneOrFail(Circuit_Version, { id });
    em.assign(circuit_version, req.body.sanitizeInput);
    await em.flush();
    res.status(200).json({ message: "Circuit_Version class updated", data: circuit_version });
  } catch (error:any) {
    res.status(500).json({ data: error.message });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);
    const circuit_version = await em.findOneOrFail(Circuit_Version, { id });
    await em.removeAndFlush(circuit_version);
    res.status(200).json({ message: "Circuit_Version class deleted", data: circuit_version });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

export const Circuit_VersionController = {
  sanitizeCircuit_VersionInput,
  getAll,
  getOne,
  add,
  update,
  remove
};