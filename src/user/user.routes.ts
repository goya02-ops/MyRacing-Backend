import { UserController as controller } from "./user.controller.js";
import { Router } from "express";

export const userRouter = Router();

userRouter.get("/", controller.getAll);
userRouter.get("/:id", controller.getOne);
userRouter.post("/", controller.sanitizeUserInput, controller.add);
userRouter.put("/:id", controller.sanitizeUserInput, controller.update);
userRouter.patch("/:id", controller.sanitizeUserInput, controller.update);
userRouter.delete("/:id", controller.remove);