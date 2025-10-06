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
app.get("/datasetsUser", (req, res) => {
  res.sendFile(path.join(__dirname, "views/dataSets-user.html"));
});

app.get("/datasetsAdmin", (req, res) => {
  res.sendFile(path.join(__dirname, "views/dataSets-admin.html"));
});


app.get("/datasetsUser/new", (req, res) => {
  res.sendFile(path.join(__dirname, "views/create-dataset.html"));
});

app.get("/datasetsUser/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "views/dataset.html"));
});


// Servir CSS y JS de views
app.use("/css", express.static(path.join(__dirname, "views/css")));
app.use("/js", express.static(path.join(__dirname, "views/js")));

// Servir archivos estáticos desde las carpetas de uploads
app.use('/uploads/dataset-images', express.static(path.join(__dirname, 'uploads/dataset-images')));
app.use('/uploads/dataset-videos', express.static(path.join(__dirname, 'uploads/dataset-videos')));
app.use('/uploads/dataset-files', express.static(path.join(__dirname, 'uploads/dataset-files')));
app.use('/uploads/profile-pictures', express.static(path.join(__dirname, 'uploads/profile-pictures')));


app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
