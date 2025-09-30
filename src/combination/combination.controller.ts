import { Request, Response, NextFunction } from "express";
import { Combination } from "./combination.entity.js";
import { validateSameSimulator, validateDate } from "./combination.logic.js";
import { orm } from "../shared/orm.js";

function sanitizeCombinationInput(req: Request, res: Response, next: NextFunction) {
    req.body.sanitizeInput = {
        dateFrom: req.body.dateFrom,
        dateTo: req.body.dateTo,
        lapsNumber: req.body.lapsNumber,
        obligatoryStopsQuantity: req.body.obligatoryStopsQuantity,
        userType: req.body.userType,
        categoryVersion: req.body.categoryVersion,
        circuitVersion: req.body.circuitVersion,
    };

    Object.keys(req.body.sanitizeInput).forEach((key) => {
        if(req.body.sanitizeInput[key]=== undefined ) delete req.body.sanitizeInput[key];
    })

    next();

}

async function getAll(req:Request, res:Response) {
    try {
        const em = orm.em;
        const combinations = await em.find(Combination, {}, { populate: [ 'categoryVersion', 'circuitVersion']});
        res.status(200).json({message: "Find all Combinaciones", data: combinations}); 
    } catch (error: any) {
        res.status(500).json({ data: error.message});
    }
}

async function getOne(req: Request, res: Response) {
    try {
        const em = orm.em;
        const id = Number.parseInt(req.params.id);    
        const combination = await em.findOneOrFail( Combination, {id}, {populate: ['categoryVersion', 'circuitVersion']})
        res.status(200).json({message: "Combination found", data: combination});
    } catch (error: any){
        res.status(500).json({ data: error.message});
    }
}

async function add(req: Request, res: Response) {
    try {
        const em = orm.em;
        const idCategoryVersion = Number.parseInt(req.body.sanitizeInput.categoryVersion);
        const idCircuitVersion = Number.parseInt(req.body.sanitizeInput.circuitVersion);
        const validDate = validateDate(req.body.sanitizeInput);

        if (!validDate) {
            res.status(400).json({ message: "dateFrom must be earlier than dateTo." });
            return;
        }

        const validSimulator = await validateSameSimulator(idCategoryVersion, idCircuitVersion);

        if (!validSimulator) {
            res.status(400).json({ message: "CategoryVersion and CircuitVersion must belong to the same Simulator." });
            return;
        }

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

        if(req.body.sanitizeInput.dateFrom && req.body.sanitizeInput.dateTo) {
            const validDate = validateDate(req.body.sanitizeInput);
            if (!validDate) {
                res.status(400).json({ message: "dateFrom must be earlier than dateTo." });
                return;
            }
        }

        if (req.body.sanitizeInput.categoryVersion && req.body.sanitizeInput.circuitVersion) {
            const idCategoryVersion = Number.parseInt(req.body.sanitizeInput.categoryVersion);
            const idCircuitVersion = Number.parseInt(req.body.sanitizeInput.circuitVersion);
            const validSimulator = await validateSameSimulator(idCategoryVersion, idCircuitVersion);
            if (!validSimulator) {
                res.status(400).json({ message: "CategoryVersion and CircuitVersion must belong to the same Simulator." });
                return;
            }
        }

        em.assign(combination, req.body.sanitizeInput);
        await em.flush();
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
    remove
};