import 'reflect-metadata'
import express from "express";
import { categoryRouter } from "./category/category.routes.js";

import { circuitRouter } from "./circuit/circuit.routes.js";
import { userRouter } from "./user/user.routes.js";
import { simulatorRouter } from './simulator/simulator.routes.js';
import { orm, syncSchema } from './shared/orm.js';
import { RequestContext } from '@mikro-orm/core';
import { Circuit_versionController as controller } from "./circuit_version/circuit_version.controller.js"; 
import { versionCategoryRouter } from './version_category/version-category.routes.js';
import { circuit_versionRouter } from "./circuit_version/circuit_version.routes.js";

const app = express();
app.use(express.json());

//luego de los middleware bases
app.use((req, res, next) => {
  RequestContext.create(orm.em, next);
});

//antes de las rutas y de los middleware de negocio

app.use("/api/categories", categoryRouter);
app.use("/api/circuit_versions", circuit_versionRouter);
app.use("/api/circuits", circuitRouter);
app.use("/api/users", userRouter);
app.use("/api/simulators", simulatorRouter);
app.use("/api/circuit_versions", circuit_versionRouter);
app.use("/api/version-categories", versionCategoryRouter);


app.use((_, res) => {
  res.status(404).json({ message: "Not Found" });
  return;
})

await syncSchema(); //never in production

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});