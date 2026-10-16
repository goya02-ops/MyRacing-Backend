import { Request, Response, NextFunction } from 'express';
import { MembershipService } from './membership.service.js';
import { handleControllerError } from '../shared/error.util.js';

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
    const memberships = await MembershipService.findAll();
    res
      .status(200)
      .json({ message: 'Find all memberships classes', data: memberships });
  } catch (error) {
    handleControllerError(error, res);
  }
}
const getCurrentMembership = async (req: Request, res: Response) => {
  try {
    const cm = await MembershipService.getCurrent();
    if (!cm) {
      return res.status(404).json({
        message: 'No se encontró un precio de membresía configurado.',
      });
    }

    res.status(200).json({ data: cm });
  } catch (error) {
    handleControllerError(error, res);
  }
};

async function getOne(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const membership = await MembershipService.findOne(id);
    res.status(200).json({ message: 'Membership found: ', data: membership });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function add(req: Request, res: Response) {
  try {
    const membership = await MembershipService.create(req.body.sanitizeInput);
    res
      .status(201)
      .json({ message: 'Membership class created', data: membership });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const membership = await MembershipService.update(
      id,
      req.body.sanitizeInput
    );
    res
      .status(200)
      .json({ message: 'Membership class updated', data: membership });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const membership = await MembershipService.remove(id);
    res
      .status(200)
      .json({ message: 'Membership class deleted', data: membership });
  } catch (error) {
    handleControllerError(error, res);
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
