import { CategoryVersionController as controller } from "./version-category.controller.js";
import {Router} from "express"

export const categoryVersionRouter =  Router() //Por mas que diga export, es 
// instancia de Router, solo que se pone para que demas archivos puedan importarlo


categoryVersionRouter.get("/", controller.getAll);
categoryVersionRouter.get("/:id", controller.getOne);
categoryVersionRouter.post("/", controller.sanitizeCategoryVersionInput, controller.add);
categoryVersionRouter.put("/:id", controller.sanitizeCategoryVersionInput, controller.update);
categoryVersionRouter.patch("/:id", controller.sanitizeCategoryVersionInput, controller.update);
categoryVersionRouter.delete("/:id", controller.remove);

//Estos son los endpoints