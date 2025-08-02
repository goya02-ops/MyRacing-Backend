import { Circuit_VersionController as controller } from "./circuit_version.controller.js";
import { Router } from "express";

export const circuit_versionRouter = Router();
circuit_versionRouter.get("/", controller.getAll);
circuit_versionRouter.get("/:id", controller.getOne);
circuit_versionRouter.post("/", controller.sanitizeCircuit_VersionInput,controller.add);
circuit_versionRouter.put("/:id", controller.sanitizeCircuit_VersionInput,controller.update);
circuit_versionRouter.patch("/:id", controller.sanitizeCircuit_VersionInput, controller.update);
circuit_versionRouter.delete("/:id", controller.remove);