import { CombinationController as controller} from "./combination.controller.js";
import { Router } from "express";

export const combinationRouter = Router();
combinationRouter.get("/", controller.getAll);
combinationRouter.get("/:id", controller.getOne);
combinationRouter.post("/", controller.sanitizeCombinationInput, controller.add);
combinationRouter.put("/:id", controller.sanitizeCombinationInput, controller.update);
combinationRouter.patch("/:id", controller.sanitizeCombinationInput, controller.update);
combinationRouter.delete("/:id", controller.remove);