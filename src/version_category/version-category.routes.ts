import { VersionCategoryController as controller } from "./version-category.controller.js";
import {Router} from "express"

export const versionCategoryRouter =  Router() //Por mas que diga export, es 
// instancia de Router, solo que se pone para que demas archivos puedan importarlo


versionCategoryRouter.get("/", controller.getAll);
versionCategoryRouter.get("/:id", controller.getOne);
versionCategoryRouter.post("/", controller.sanitizeVersionCategoryInput, controller.add);
versionCategoryRouter.put("/:id", controller.sanitizeVersionCategoryInput, controller.update);
versionCategoryRouter.patch("/:id", controller.sanitizeVersionCategoryInput, controller.update);
versionCategoryRouter.delete("/:id", controller.remove);

//Estos son los endpoints