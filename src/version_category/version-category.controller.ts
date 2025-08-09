import { Request, Response, NextFunction } from "express";
import { VersionCategory } from "./version-category.entity.js";
import { Category } from "../category/category.entity.js";
import { Simulator } from "../simulator/simulator.entity.js";
import { orm } from "../shared/orm.js";

function sanitizeVersionCategoryInput(req: Request, res: Response, next:NextFunction) {
    //Esto lo que hace es limpiar los datos que llegan 
    req.body.sanitizeInput = {
        descripcion: req.body.descripcion,
        simuladorId: req.body.simuladorId,
        categoriaId: req.body.categoriaId,
    };
    //Toma los datos de arriba del body de la peticion

    Object.keys(req.body.sanitizeInput).forEach((key) => {
        if(req.body.sanitizeInput[key]=== undefined ) {
                delete req.body.sanitizeInput[key];

        }
    })

    next();
}

const em = orm.em.fork(); //Nueva instancia del entity manager para que cada operacion se haga sin conflictos

async function getAll(req:Request, res:Response) { //Obtiene todas las versiones de categoria
    try {
        const versionCategories = await em.find(VersionCategory, {}, { populate: [ 'simulador', 'categoria']});
        //Basicamente traemos los registros de VersionCategory y ademas los obj completos de sim y cat
        res.status(200).json({message: "Find all Version Categories", data: versionCategories});
    } catch (error: any) {
        res.status(500).json({ data: error.message});
    }
}

async function getOne(req:Request, res:Response) {
    try { 
        const id = Number.parseInt(req.params.id);
        const versionCategory = await em.findOneOrFail(VersionCategory, { id }, {populate: ['simulador', 'categoria']});
        res.status(200).json({message: "Version Category found", data: versionCategory});
    } catch (error:any){
        res.status(500).json({ data: error.message});
        
    }
}

async function add(req:Request, res:Response) {
    try {
        const { descripcion, simuladorId, categoriaId} = req.body.sanitizeInput;
        //No entendi esto
        const simulador = await em.findOneOrFail(Simulator, { id: simuladorId});
        const categoria = await em.findOneOrFail(Category, {id: categoriaId});
        const versionCategory = em.create(VersionCategory, {
            descripcion,
            simulador,
            categoria,
        });

        await em.flush(); //El em.create la crea en memoria y em.flush realiza el insert
        res.status(201).json({ message: "Version Category created", data: versionCategory});


    } catch (error:any) {
        res.status(500).json({ data: error.message});
    }
}

async function update(req:Request, res: Response) {
    try {
        const id = Number.parseInt(req.params.id); //Obtengo id
        const versionCategory = await em.findOneOrFail(VersionCategory, { id });

        const dataToUpdate: any = {};
        
        if (req.body.sanitizeInput.descripcion) {
            dataToUpdate.descripcion = req.body.sanitizeInput.descripcion;
        }

        if (req.body.sanitizeInput.simuladorId) {
            dataToUpdate.simulador = await em.findOneOrFail(Simulator, {id: req.body.sanitizeInput.simuladorId});
        }
        if(req.body.sanitizeInput.categoriaId) {
            dataToUpdate.categoria = await em.findOneOrFail(Category, {id: req.body.sanitizeInput.categoriaId});
        }
        //Chequear un par de cosas

        em.assign(versionCategory, dataToUpdate); //Asignar los nuevos datos a la entidad que ya existe
        await em.flush(); //Ejecuta el update
        res.status(200).json({ message: 'Version Category updated', data: versionCategory});
    } catch (error:any) {
        res.status(500).json({ data: error.message});
    }
}

async function remove(req: Request, res: Response) {
    try { 
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