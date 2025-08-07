
import { SimulatorController as controller } from "./simulator.controller.js";
import { Router } from "express";

export const simulatorRouter = Router();
simulatorRouter.get("/", controller.findAll);
simulatorRouter.get("/:id", controller.findOne);
simulatorRouter.post("/", controller.sanitizeSimulatorInput, controller.add);
simulatorRouter.put("/:id", controller.sanitizeSimulatorInput, controller.update);
simulatorRouter.patch("/:id", controller.sanitizeSimulatorInput, controller.update);
simulatorRouter.delete("/:id", controller.remove);