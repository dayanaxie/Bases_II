import express from "express";
import dotenv from "dotenv";
import connectMongo from "./config/mongo.js";
import datasetRoutes from "./routes/datasetRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Resolve __dirname (not available in ESM by default)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'css')));

// Conexión a Mongo
connectMongo();

// Rutas API REST
app.use("/api/datasets", datasetRoutes);

// Rutas para HTML en views
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/index.html"));
});

app.get("/datasets", (req, res) => {
  res.sendFile(path.join(__dirname, "views/dataSets-user.html"));
});

app.get("/datasets/new", (req, res) => {
  res.sendFile(path.join(__dirname, "views/create-dataSet.html"));
});

// Servir CSS y JS de views
app.use("/css", express.static(path.join(__dirname, "views/css")));
app.use("/js", express.static(path.join(__dirname, "views/js")));

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
