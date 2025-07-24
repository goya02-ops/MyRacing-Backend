import { Circuitcontroller as controller } from "./circuit.controller.js";
import { Router } from "express";

export const circuitRouter = Router();
circuitRouter.get("/", controller.getAll);
circuitRouter.get("/:id", controller.getOne);
circuitRouter.post("/", controller.sanitizeCircuitInput,controller.add);
circuitRouter.put("/:id", controller.sanitizeCircuitInput,controller.update);
circuitRouter.patch("/:id", controller.sanitizeCircuitInput, controller.update);
circuitRouter.delete("/:id", controller.remove);