import { CategoryController as controller } from "./category.controller.js";
import { Router } from "express";

export const categoryRoutes = Router();
categoryRoutes.get("/", controller.getAll);
categoryRoutes.get("/:id", controller.getOne);
categoryRoutes.post("/", controller.sanitizeCategoryInput,controller.add);
categoryRoutes.put("/:id", controller.sanitizeCategoryInput,controller.update);
categoryRoutes.patch("/:id", controller.sanitizeCategoryInput, controller.update);
categoryRoutes.delete("/:id", controller.remove);