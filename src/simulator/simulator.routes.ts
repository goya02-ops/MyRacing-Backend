import { RequestContext } from '@mikro-orm/core';
import { orm } from '../shared/orm.js';
import { Router } from "express";

import { SimulatorController as controller } from "./simulator.controller.js";

export const simulatorRouter = Router();

simulatorRouter.use((req, res, next) => RequestContext.create(orm.em.fork(), next));

simulatorRouter.get("/", controller.getAllSimulators);
simulatorRouter.get("/:id", controller.getOneSimulator);
simulatorRouter.post("/", controller.sanitizeSimulatorInput, controller.addSimulator);
simulatorRouter.put("/:id", controller.sanitizeSimulatorInput, controller.updateSimulator);
simulatorRouter.patch("/:id", controller.sanitizeSimulatorInput, controller.updateSimulator);
simulatorRouter.delete("/:id", controller.removeSimulator);