import { Request, Response, NextFunction } from "express";
import { Combination } from "./combination.entity.js";
import { orm } from "../shared/orm.js";



function sanitizeCombinationInput(req: Request, res: Response, next: NextFunction) {
    console.log("req.body recibido:", req.body); // Agrega esta línea
    req.body.sanitizeInput = {
        dateFrom: req.body.dateFrom,
        dateTo: req.body.dateTo,
        lapsNumber: req.body.lapsNumber,
        obligatoryStopsQuantity: req.body.obligatoryStopsQuantity,
        userType: req.body.userType,
        versionCategory: req.body.versionCategoryId,
        versionCircuit: req.body.versionCircuitId,
    };
    console.log("sanitizeInput creado:", req.body.sanitizeInput);
    Object.keys(req.body.sanitizeInput).forEach((key) => {
        if(req.body.sanitizeInput[key]=== undefined ) delete req.body.sanitizeInput[key];
    })
    console.log("sanitizeInput final:", req.body.sanitizeInput);
    next();

}

async function getAll(req:Request, res:Response) {
    try {
        const em = orm.em;
        const combinations = await em.find(Combination, {}, { populate: [ 'versionCategory', 'versionCircuit']});
        res.status(200).json({message: "Find all Combinaciones", data: combinations});
    } catch (error: any) {
        res.status(500).json({ data: error.message});
    }
}

async function getOne(req: Request, res: Response) {
    try {
        const em = orm.em;
        const id = Number.parseInt(req.params.id);    
        const combination = await em.findOneOrFail( Combination, {id}, {populate: ['versionCategory', 'versionCircuit']})
        res.status(200).json({message: "Combination found", data: combination});
    } catch (error: any){
        res.status(500).json({ data: error.message});
    }
}

async function add(req: Request, res: Response) {
    try {
        const em = orm.em;
        const combination = em.create(Combination, req.body.sanitizeInput);
        await em.flush();
        res.status(201).json({ message: "Combination created", data: combination});
    
    } catch (error: any) {
        res.status(500).json({ data: error.message});
    }
}

async function update(req: Request, res: Response) {
    try {
        const em = orm.em
        const id = Number.parseInt(req.params.id);    
        const combination = await em.findOneOrFail(Combination, { id });
        em.assign(combination, req.body.sanitizeInput); //Asignar los nuevos datos a la entidad que ya existe
        //La IA me dice que en realidad habría que poner la instancia, no la Entidad
        await em.flush(); //Ejecuta el update
        res.status(200).json({ message: 'Combination updated', data: combination});
    } catch (error:any) {
        res.status(500).json({ data: error.message});
    }
}

async function remove(req: Request, res: Response) {
    try { 
        const em = orm.em;
        const id = Number.parseInt(req.params.id); 
        const combination = await em.findOneOrFail(Combination, {id});
        await em.removeAndFlush(combination);
        res.status(200).json({ message: "Combination deleted", data: combination});

    } catch (error:any) { 
        res.status(500).json({ data: error.message});
    }
}


export const CombinationController = {
    sanitizeCombinationInput,
    getAll,
    getOne,
    add,
    update,
    remove,
};