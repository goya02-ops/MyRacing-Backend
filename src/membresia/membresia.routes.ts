import { MembresiaController as controller } from "./membresia.controller.js";
import { Router } from "express";


export const membresiaRouter = Router();


membresiaRouter.get("/", controller.getAll);
membresiaRouter.get("/:id", controller.getOne);
membresiaRouter.post("/", controller.sanitizeMembresiaInput, controller.add);
membresiaRouter.put("/:id", controller.sanitizeMembresiaInput, controller.update);
membresiaRouter.patch("/:id", controller.sanitizeMembresiaInput, controller.update);
membresiaRouter.delete("/:id", controller.remove);