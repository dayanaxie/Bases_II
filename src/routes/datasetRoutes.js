import express from "express";
import Dataset from "../models/Dataset.js";
import { uploadDataset } from "../config/multer.js";

const router = express.Router();

// Crear dataset con múltiples archivos
router.post("/", uploadDataset.fields([
  { name: 'foto', maxCount: 1 },
  { name: 'video_guia', maxCount: 1 },
  { name: 'archivos', maxCount: 10 }
]), async (req, res) => {
  try {
    console.log("Archivos recibidos para dataset:", req.files);
    console.log("Datos recibidos:", req.body);

    const { nombre, descripcion } = req.body;

    // Validaciones
    if (!nombre || !descripcion) {
      return res.status(400).json({ 
        success: false,
        error: "Nombre y descripción son obligatorios" 
      });
    }

    const creadorId = req.body.creadorId;
    
    if (!creadorId) {
      return res.status(400).json({
        success: false,
        error: "ID de usuario creador es requerido"
      });
    }

    // Procesar archivos
    const foto = req.files['foto'] ? req.files['foto'][0] : null;
    const video_guia = req.files['video_guia'] ? req.files['video_guia'][0] : null;
    const archivos = req.files['archivos'] ? req.files['archivos'] : [];

    // Calcular tamaño total en bytes
    let tamanoTotal = 0;
    if (foto) tamanoTotal += foto.size;
    if (video_guia) tamanoTotal += video_guia.size;
    archivos.forEach(archivo => {
      tamanoTotal += archivo.size;
    });

    // Convertir a MB con dos decimales
    tamanoTotal = Number((tamanoTotal / (1024 * 1024)).toFixed(2));


    const dataset = new Dataset({
      nombre: nombre,
      descripcion: descripcion,
      foto: foto ? `/uploads/dataset-images/${foto.filename}` : null,
      video_guia: video_guia ? `/uploads/dataset-videos/${video_guia.filename}` : null,
      archivos: archivos.map(archivo => `/uploads/dataset-files/${archivo.filename}`),
      estado: "pendiente", 
      tamano: tamanoTotal, // En bytes
      descargas: 0, // Inicializar en 0
      creadorId: creadorId

    });

    await dataset.save();
    
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
    const datasets = await Dataset.find()
    .populate('creadorId', 'username nombreCompleto')
    .sort({ fecha_inclusion: -1 });
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
    const dataset = await Dataset.findById(datasetId).populate('creadorId');
    
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

    const dataset = await Dataset.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

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
        
        const dataset = await Dataset.findByIdAndUpdate(
            datasetId,
            { $inc: { descargas: 1 } }, 
            { new: true } 
        );

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

    const dataset = await Dataset.findByIdAndUpdate(
      req.params.id,
      { estado: estado },
      { new: true }
    );

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