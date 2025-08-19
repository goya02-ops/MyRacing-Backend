import { Request, Response, NextFunction } from "express";
import { Membresia } from "./membresia.entity.js";
import { orm } from "../shared/orm.js";


function sanitizeMembresiaInput(req: Request, res: Response, next: NextFunction){

  req.body.sanitizeInput = {
    descripcion: req.body.descripcion,
    valorMembresia: req.body.valorMembresia,
  };

  Object.keys(req.body.sanitizeInput).forEach((key) => {
    if (req.body.sanitizeInput[key] === undefined) delete req.body.sanitizeInput[key];
  });

  next();
}

async function getAll(req: Request, res: Response) {
  try {
    const em = orm.em;
    const membresias = await em.find(Membresia, {});
    res.status(200).json({message: "Lista de membresías obtenida", data: membresias});
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function getOne(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id)
    const membresia = await em.findOneOrFail(Membresia,{ id })
    res.status(200).json({message: "Membresía encontrada: ", data: membresia})
  } catch (error: any) {
    res.status(500).json({ data: error.message })
  }
}

async function add(req: Request, res: Response) {
  try{
    const em = orm.em;
    const membresia = em.create(Membresia, req.body.sanitizeInput);
    await em.flush();
    res.status(201).json({ message: "Membresía creada exitosamente", data: membresia });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const membresia = await em.findOneOrFail(Membresia, { id });
    em.assign(membresia, req.body.sanitizeInput);
    await em.flush();
    res.status(200).json({ message: "Membresía actualizada exitosamente", data: membresia });
  } catch (error:any) {
    res.status(500).json({ data: error.message });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const membresia = await em.findOneOrFail(Membresia, { id });
    await em.removeAndFlush(membresia);
    res.status(200).json({ message: "Membresía eliminada exitosamente", data: membresia });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

export const MembresiaController = {
  sanitizeMembresiaInput,
  getAll,
  getOne,
  add,
  update,
  remove
};