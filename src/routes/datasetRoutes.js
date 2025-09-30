import express from "express";
import Dataset from "../models/Dataset.js";

const router = express.Router();

// Crear dataset
router.post("/", async (req, res) => {
  try {
    const dataset = new Dataset({
      nombre: req.body.nombre,
      descripcion: req.body.descripcion,
      foto: req.body.foto,
      archivos: req.body.archivos ? req.body.archivos.split(",") : [],
      video_guia: req.body.video_guia,
      tamano: req.body.tamano || 0
    });
    await dataset.save();
    res.status(201).json(dataset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar datasets
router.get("/", async (req, res) => {
  try {
    const datasets = await Dataset.find();
    res.json(datasets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
