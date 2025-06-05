import express from "express";
import { categoryRoutes } from "./category/category.routes.js";

const app = express();
app.use(express.json());
app.use("/api/categories", categoryRoutes);

app.use((_, res) => {
  res.status(404).json({ message: "Not Found" });
  return;
})

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});