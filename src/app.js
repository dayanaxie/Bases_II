import express from "express";
import dotenv from "dotenv";
import connectMongo from "./config/mongo.js";
import datasetRoutes from "./routes/datasetRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import path from "path";
import { fileURLToPath } from "url";
import { requireAuth } from "./middleware/auth.js"; 


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
app.use("/api/users", userRoutes);


// Rutas para HTML en views
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/login.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views/login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "views/register.html"));
});

// Rutas protegidas (requieren autenticación)
app.get("/homeUser", (req, res) => {
  res.sendFile(path.join(__dirname, "views/dataSets-user.html"));
});

app.get("/datasets/new", (req, res) => {
  res.sendFile(path.join(__dirname, "views/new-dataset.html"));
});


// Servir CSS y JS de views
app.use("/css", express.static(path.join(__dirname, "views/css")));
app.use("/js", express.static(path.join(__dirname, "views/js")));

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
