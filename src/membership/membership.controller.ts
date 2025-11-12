import { Request, Response, NextFunction } from 'express';
import { Membership } from './membership.entity.js';
import { orm } from '../shared/orm.js';
import { currentMembership } from '../utils/currentMembership.js';

function sanitizeMembresiaInput(
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.body.sanitizeInput = {
    dateFrom: req.body.dateFrom,
    price: req.body.price,
  };

  Object.keys(req.body.sanitizeInput).forEach((key) => {
    if (req.body.sanitizeInput[key] === undefined)
      delete req.body.sanitizeInput[key];
  });

  next();
}

async function getAll(req: Request, res: Response) {
  try {
    const em = orm.em;
    const memberships = await em.find(Membership, {});
    res
      .status(200)
      .json({ message: 'Find all memberships classes', data: memberships });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}
const getCurrentMembership = async (req: Request, res: Response) => {
  try {
    const cm = await currentMembership();
    if (!cm) {
      return res.status(404).json({
        message: 'No se encontró un precio de membresía configurado.',
      });
    }

    res.status(200).json({ data: cm });
  } catch (error) {
    console.error('Error fetching current membership:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

async function getOne(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const membership = await em.findOneOrFail(Membership, { id });
    res.status(200).json({ message: 'Membership found: ', data: membership });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function add(req: Request, res: Response) {
  try {
    const em = orm.em;
    const membership = em.create(Membership, req.body.sanitizeInput);
    await em.flush();
    res
      .status(201)
      .json({ message: 'Membership class created', data: membership });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const membership = await em.findOneOrFail(Membership, { id });
    em.assign(membership, req.body.sanitizeInput);
    await em.flush();
    res
      .status(200)
      .json({ message: 'Membership class updated', data: membership });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const membership = await em.findOneOrFail(Membership, { id });
    await em.removeAndFlush(membership);
    res
      .status(200)
      .json({ message: 'Membership class deleted', data: membership });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

export const MembershipController = {
  sanitizeMembresiaInput,
  getAll,
  getCurrentMembership,
  getOne,
  add,
  update,
  remove,
};
