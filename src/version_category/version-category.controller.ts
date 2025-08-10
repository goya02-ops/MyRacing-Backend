import { Request, Response, NextFunction } from "express";
import { VersionCategory } from "./version-category.entity.js";
import { orm } from "../shared/orm.js";

function sanitizeVersionCategoryInput(req: Request, res: Response, next:NextFunction) {
    //Esto lo que hace es limpiar los datos que llegan 
    req.body.sanitizeInput = {
        status: req.body.status,
        simulator: req.body.simulator,
        category: req.body.category,
    };
    //Toma los datos de arriba del body de la peticion

    Object.keys(req.body.sanitizeInput).forEach((key) => {
        if(req.body.sanitizeInput[key]=== undefined ) delete req.body.sanitizeInput[key];
    })

    next();
}

async function getAll(req:Request, res:Response) { //Obtiene todas las versiones de categoria
    try {
        const em = orm.em;
        const versionCategories = await em.find(VersionCategory, {}, { populate: [ 'simulator', 'category']});
        //Basicamente traemos los registros de VersionCategory y ademas los obj completos de sim y cat
        res.status(200).json({message: "Find all Version Categories", data: versionCategories});
    } catch (error: any) {
        res.status(500).json({ data: error.message});
    }
}

async function getOne(req:Request, res:Response) {
    try {
        const em = orm.em;
        const id = Number.parseInt(req.params.id);
        const versionCategory = await em.findOneOrFail(VersionCategory, { id }, {populate: ['simulator', 'category']});
        res.status(200).json({message: "Version Category found", data: versionCategory});
    } catch (error:any){
        res.status(500).json({ data: error.message});
        
    }
}

async function add(req:Request, res:Response) {
    try {
        const em = orm.em;
        const versionCategory = em.create(VersionCategory, req.body);
        await em.flush(); //El em.create la crea en memoria y em.flush realiza el insert
        res.status(201).json({ message: "Version Category created", data: versionCategory});
    } catch (error:any) {
        res.status(500).json({ data: error.message});
    }
}

async function update(req:Request, res: Response) {
    try {
        const em = orm.em;
        const id = Number.parseInt(req.params.id); //Obtengo id
        const versionCategory = await em.findOneOrFail(VersionCategory, { id });
        em.assign(versionCategory, req.body); //Asignar los nuevos datos a la entidad que ya existe
        await em.flush(); //Ejecuta el update
        res.status(200).json({ message: 'Version Category updated', data: versionCategory});
    } catch (error:any) {
        res.status(500).json({ data: error.message});
    }
}

async function remove(req: Request, res: Response) {
    try { 
        const em = orm.em;
        const id = Number.parseInt(req.params.id); //A que se refiere que lo toma de la URL, como sabe cual quiero
        const versionCategory = await em.findOneOrFail(VersionCategory, {id});
        await em.removeAndFlush(versionCategory);
        res.status(200).json({ message: "Version category deleted", data: versionCategory});

    } catch (error:any) {
        res.status(500).json({ data: error.message});
    }
}

export const VersionCategoryController = {
    sanitizeVersionCategoryInput,
    getAll,
    getOne,
    add,
    update,
    remove
};