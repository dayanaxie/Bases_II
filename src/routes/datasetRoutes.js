// datasetRoutes.js
import express from "express";
import { uploadDataset } from "../config/multer.js";
import DatasetRepository from '../repositories/dataset-repository.js';
import mongoose from 'mongoose';

const router = express.Router();

// Initialize repository
const datasetRepo = new DatasetRepository(mongoose);

// Crear dataset con múltiples archivos
router.post("/", uploadDataset.fields([
  { name: 'foto', maxCount: 1 },
  { name: 'video_guia', maxCount: 1 },
  { name: 'archivos', maxCount: 10 }
]), async (req, res) => {
  try {
    console.log("Archivos recibidos para dataset:", req.files);
    console.log("Datos recibidos:", req.body);

    const { nombre, descripcion, creadorId } = req.body;

    // Validaciones
    if (!nombre || !descripcion || !creadorId) {
      return res.status(400).json({ 
        success: false,
        error: "Nombre, descripción y creadorId son obligatorios" 
      });
    }

    // Procesar archivos
    const foto = req.files['foto'] ? req.files['foto'][0] : null;
    const video_guia = req.files['video_guia'] ? req.files['video_guia'][0] : null;
    const archivos = req.files['archivos'] ? req.files['archivos'] : [];

    // Calcular tamaño total
    let tamanoTotal = 0;
    if (foto) tamanoTotal += foto.size;
    if (video_guia) tamanoTotal += video_guia.size;
    archivos.forEach(archivo => {
      tamanoTotal += archivo.size;
    });

    // Convertir a MB con dos decimales
    tamanoTotal = Number((tamanoTotal / (1024 * 1024)).toFixed(2));

    // Preparar datos del dataset
    const datasetData = {
      nombre,
      descripcion,
      foto: foto ? `/uploads/dataset-images/${foto.filename}` : null,
      video_guia: video_guia ? `/uploads/dataset-videos/${video_guia.filename}` : null,
      archivos: archivos.map(archivo => `/uploads/dataset-files/${archivo.filename}`),
      estado: "pendiente",
      tamano: tamanoTotal,
      descargas: 0,
      creadorId
    };

    // Crear dataset usando repository
    const dataset = await datasetRepo.createDataset(datasetData);
    
    res.status(201).json({
      success: true,
      message: "Dataset creado exitosamente",
      dataset: dataset
    });

  } catch (err) {
    console.error("Error creando dataset:", err);
    
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// Listar todos los datasets
router.get("/", async (req, res) => {
  try {
    const datasets = await datasetRepo.getAllDatasets();
    
    res.json({
      success: true,
      datasets: datasets
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// Listar todos los datasets aprobados
router.get("/aprobados", async (req, res) => {
  try {
    const datasets = await datasetRepo.getApprovedDatasets();
    
    res.json({
      success: true,
      datasets: datasets
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// Obtener dataset por ID
router.get("/:id", async (req, res) => {
  try {
    const datasetId = req.params.id;
    const dataset = await datasetRepo.getDatasetById(datasetId);
    
    if (!dataset) {
      return res.status(404).json({ error: 'Dataset no encontrado' });
    }
    
    res.json(dataset);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el dataset' });
  }
});

// Actualizar dataset
router.put("/:id", uploadDataset.fields([
  { name: 'foto', maxCount: 1 },
  { name: 'video_guia', maxCount: 1 },
  { name: 'archivos', maxCount: 10 }
]), async (req, res) => {
  try {
    const { nombre, descripcion, estado } = req.body;
    
    const updateData = { nombre, descripcion };
    if (estado) updateData.estado = estado;

    // Procesar archivos si se enviaron
    if (req.files) {
      const foto = req.files['foto'] ? req.files['foto'][0] : null;
      const video_guia = req.files['video_guia'] ? req.files['video_guia'][0] : null;
      const archivos = req.files['archivos'] ? req.files['archivos'] : [];

      if (foto) updateData.foto = `/uploads/dataset-images/${foto.filename}`;
      if (video_guia) updateData.video_guia = `/uploads/dataset-videos/${video_guia.filename}`;
      if (archivos.length > 0) {
        updateData.archivos = archivos.map(archivo => `/uploads/dataset-files/${archivo.filename}`);
      }
    }

    // Actualizar dataset usando repository
    const dataset = await datasetRepo.updateDataset(req.params.id, updateData);

    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: "Dataset no encontrado"
      });
    }

    res.json({
      success: true,
      message: "Dataset actualizado exitosamente",
      dataset: dataset
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

// Ruta para incrementar descargas
router.post('/:id/download', async (req, res) => {
    try {
        const datasetId = req.params.id;
        
        const dataset = await datasetRepo.incrementDownloads(datasetId);

        if (!dataset) {
            return res.status(404).json({ error: 'Dataset no encontrado' });
        }

        res.json({ 
            success: true, 
            nuevasDescargas: dataset.descargas 
        });
        
    } catch (error) {
        console.error('Error incrementando descargas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Cambiar estado del dataset
router.patch("/:id/estado", async (req, res) => {
  try {
    const { estado } = req.body;

    if (!["pendiente", "aprobado", "desactivado"].includes(estado)) {
      return res.status(400).json({
        success: false,
        error: "Estado no válido"
      });
    }

    const dataset = await datasetRepo.updateDatasetState(req.params.id, estado);

    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: "Dataset no encontrado"
      });
    }

    res.json({
      success: true,
      message: `Dataset ${estado} exitosamente`,
      dataset: dataset
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

export default router;