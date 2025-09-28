import 'reflect-metadata'
import express from "express";
import { orm, syncSchema } from './shared/orm.js';
import { RequestContext } from '@mikro-orm/mysql';

import { categoryRouter } from "./category/category.routes.js";
import { circuitRouter } from "./circuit/circuit.routes.js";
import { userRouter } from "./user/user.routes.js";
import { simulatorRouter } from './simulator/simulator.routes.js';
import { categoryVersionRouter } from './category-version/category-version.routes.js';
import { circuitVersionRouter } from "./circuit-version/circuit-version.routes.js";
import { combinationRouter } from './combination/combination.routes.js';
import { membershipRouter } from './membership/membership.routes.js';
import { raceRouter } from './race/race.routes.js';
import { raceUserRouter } from './race-user/race-user.routes.js';

const app = express();
app.use(express.json());

//luego de los middleware bases
app.use((req, res, next) => {
RequestContext.create(orm.em, next);
});

//antes de las rutas y de los middleware de negocio
app.use("/api/categories", categoryRouter);
app.use("/api/circuits", circuitRouter);
app.use("/api/simulators", simulatorRouter);
app.use("/api/users", userRouter);
app.use("/api/circuits-version", circuitVersionRouter);
app.use("/api/categories-version", categoryVersionRouter);
app.use("/api/combinations", combinationRouter);
app.use("/api/membership", membershipRouter);
app.use("/api/races", raceRouter);
app.use('/api/race-users', raceUserRouter);

// Middleware 404 debe ir AL FINAL, después de todas las rutas
app.use((_, res) => {
res.status(404).json({ message: "Not Found" });
return;
})

await syncSchema(); //never in production

app.listen(3000, () => {
console.log("Server is running on port 3000");
});