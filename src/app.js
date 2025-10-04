import express from "express";
import dotenv from "dotenv";
import connectMongo from "./config/mongo.js";
import datasetRoutes from "./routes/datasetRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexión a Mongo
connectMongo();

// Rutas API REST
app.use("/api/datasets", datasetRoutes);
app.use("/api/users", userRoutes);


// ---------------------------
// Rutas para HTML en views
// ---------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/login.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views/login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "views/register.html"));
});

app.get("/homeUser", (req, res) => {
  res.sendFile(path.join(__dirname, "views/dataSets-user.html"));
});

app.get("/homeAdmin", (req, res) => {
  res.sendFile(path.join(__dirname, "views/dataSets-admin.html"));
});


app.get("/datasets", (req, res) => {
  res.sendFile(path.join(__dirname, "views/datasets.html"));
});

app.get("/datasets/new", (req, res) => {
  res.sendFile(path.join(__dirname, "views/new-dataset.html"));
});

// Servir también CSS y JS de views
app.use("/css", express.static(path.join(__dirname, "views/css")));
app.use("/js", express.static(path.join(__dirname, "views/js")));

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
