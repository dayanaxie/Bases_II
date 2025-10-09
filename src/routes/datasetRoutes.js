// datasetRoutes.js
import express from "express";
import Dataset from "../models/Dataset.js";
import User from "../models/User.js";
import { uploadDataset } from "../config/multer.js";
import DatasetRepository from '../repositories/dataset-repository.js';
import mongoose from 'mongoose';

const router = express.Router();

// Initialize repository
const datasetRepo = new DatasetRepository(mongoose);

// Crear dataset con múltiples archivos
router.post(
  "/",
  uploadDataset.fields([
    { name: "foto", maxCount: 1 },
    { name: "video_guia", maxCount: 1 },
    { name: "archivos", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      console.log("Archivos recibidos para dataset:", req.files);
      console.log("Datos recibidos:", req.body);

      const { nombre, descripcion, creadorId } = req.body;

      // Validaciones
      if (!nombre || !descripcion || !creadorId) {
        // Clean up uploaded files if validation fails
        if (req.files) {
          Object.values(req.files).flat().forEach(file => {
            fs.unlinkSync(file.path);
          });
        }
        return res.status(400).json({
          success: false,
          error: "Nombre, descripción y creadorId son obligatorios",
        });
      }

      // Procesar archivos
      const foto = req.files["foto"] ? req.files["foto"][0] : null;
      const video_guia = req.files["video_guia"]
        ? req.files["video_guia"][0]
        : null;
      const archivos = req.files["archivos"] ? req.files["archivos"] : [];

      // Calcular tamaño total en bytes
      let tamanoTotal = 0;
      if (foto) tamanoTotal += foto.size;
      if (video_guia) tamanoTotal += video_guia.size;
      archivos.forEach((archivo) => {
        tamanoTotal += archivo.size;
      });

      // Convertir a MB con dos decimales
      tamanoTotal = Number((tamanoTotal / (1024 * 1024)).toFixed(2));

      const datasetData = {
        nombre: nombre,
        descripcion: descripcion,
        foto: foto ? `/uploads/dataset-images/${foto.filename}` : null,
        video_guia: video_guia
          ? `/uploads/dataset-videos/${video_guia.filename}`
          : null,
        archivos: archivos.map(
          (archivo) => `/uploads/dataset-files/${archivo.filename}`
        ),
        estado: "pendiente",
        tamano: tamanoTotal,
        descargas: 0,
        creadorId: creadorId,
      };

      // Crear dataset usando repository
      const dataset = await datasetRepo.createDataset(datasetData);

      res.status(201).json({
        success: true,
        message: "Dataset creado exitosamente",
        dataset: dataset,
      });
    } catch (err) {
      // Clean up uploaded files on error
      if (req.files) {
        Object.values(req.files).flat().forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      
      console.error("Error creando dataset:", err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

// Listar todos los datasets
router.get("/", async (req, res) => {
  try {
    const datasets = await datasetRepo.getAllDatasets();
    
    res.json({
      success: true,
      datasets: datasets,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Listar todos los datasets aprobados
router.get("/aprobados", async (req, res) => {
  try {
    const datasets = await datasetRepo.getApprovedDatasets();
    
    res.json({
      success: true,
      datasets: datasets,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Obtener dataset por ID
router.get("/:id", async (req, res) => {
  try {
    const datasetId = req.params.id;
    const dataset = await datasetRepo.getDatasetById(datasetId);
    
    if (!dataset) {
      return res.status(404).json({ error: "Dataset no encontrado" });
    }

    res.json(dataset);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener el dataset" });
  }
});

// Actualizar dataset
router.put(
  "/:id",
  uploadDataset.fields([
    { name: "foto", maxCount: 1 },
    { name: "video_guia", maxCount: 1 },
    { name: "archivos", maxCount: 10 },
  ]),
  async (req, res) => {
    try {
      const { nombre, descripcion, estado } = req.body;

      const updateData = { nombre, descripcion };
      if (estado) updateData.estado = estado;

      // Procesar archivos si se enviaron
      if (req.files) {
        const foto = req.files["foto"] ? req.files["foto"][0] : null;
        const video_guia = req.files["video_guia"]
          ? req.files["video_guia"][0]
          : null;
        const archivos = req.files["archivos"] ? req.files["archivos"] : [];

        if (foto) updateData.foto = `/uploads/dataset-images/${foto.filename}`;
        if (video_guia)
          updateData.video_guia = `/uploads/dataset-videos/${video_guia.filename}`;
        if (archivos.length > 0) {
          updateData.archivos = archivos.map(
            (archivo) => `/uploads/dataset-files/${archivo.filename}`
          );
        }
      }

      const dataset = await datasetRepo.updateDataset(req.params.id, updateData);

      if (!dataset) {
        // Clean up uploaded files if dataset not found
        if (req.files) {
          Object.values(req.files).flat().forEach(file => {
            fs.unlinkSync(file.path);
          });
        }
        return res.status(404).json({
          success: false,
          error: "Dataset no encontrado",
        });
      }

      res.json({
        success: true,
        message: "Dataset actualizado exitosamente",
        dataset: dataset,
      });
    } catch (err) {
      // Clean up uploaded files on error
      if (req.files) {
        Object.values(req.files).flat().forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  }
);

// Ruta para incrementar descargas
router.post("/:id/download", async (req, res) => {
  try {
    const datasetId = req.params.id;
    const dataset = await datasetRepo.incrementDownloads(datasetId);

    if (!dataset) {
      return res.status(404).json({ error: "Dataset no encontrado" });
    }

    res.json({
      success: true,
      nuevasDescargas: dataset.descargas,
    });
  } catch (error) {
    console.error("Error incrementando descargas:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Cambiar estado del dataset
router.patch("/:id/estado", async (req, res) => {
  try {
    const { estado } = req.body;

    if (!["pendiente", "aprobado", "desactivado"].includes(estado)) {
      return res.status(400).json({
        success: false,
        error: "Estado no válido",
      });
    }

    const dataset = await datasetRepo.updateDatasetState(req.params.id, estado);

    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: "Dataset no encontrado",
      });
    }

    res.json({
      success: true,
      message: `Dataset ${estado} exitosamente`,
      dataset: dataset,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Obtener comentarios de un dataset
router.get("/:id/comments", async (req, res) => {
  try {
    const datasetId = req.params.id;
    const comments = await datasetRepo.getDatasetComments(datasetId);

    // Obtener información de usuarios desde MongoDB
    const commentsWithUserData = await Promise.all(
      comments.map(async (comment) => {
        const user = await User.findById(comment.userId).select(
          "username nombreCompleto foto"
        );
        return {
          ...comment,
          userName: user?.username || "Usuario desconocido",
          userFullName: user?.nombreCompleto || "",
          userPhoto: user?.foto || null,
        };
      })
    );

    res.json({
      success: true,
      comments: commentsWithUserData,
    });
  } catch (error) {
    console.error("Error obteniendo comentarios:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Crear comentario en un dataset
router.post("/:id/comments", async (req, res) => {
  try {
    const datasetId = req.params.id;
    const { userId, content } = req.body;

    if (!userId || !content) {
      return res.status(400).json({
        success: false,
        error: "Usuario y contenido son requeridos",
      });
    }

    // Verificar que el dataset existe
    const dataset = await Dataset.findById(datasetId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: "Dataset no encontrado",
      });
    }

    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Usuario no encontrado",
      });
    }

    // Crear comentario usando repository
    const comment = await datasetRepo.createComment(userId, datasetId, content);

    res.status(201).json({
      success: true,
      message: "Comentario creado exitosamente",
      comment: {
        ...comment,
        userId: userId,
        content: content,
        userName: user.username,
        userFullName: user.nombreCompleto,
        userPhoto: user.foto,
      },
    });
  } catch (error) {
    console.error("Error creando comentario:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Ocultar comentario (solo admin)
router.patch("/comments/:commentId/hide", async (req, res) => {
  try {
    const { commentId } = req.params;
    await datasetRepo.hideComment(commentId);

    res.json({
      success: true,
      message: "Comentario ocultado exitosamente",
    });
  } catch (error) {
    console.error("Error ocultando comentario:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Obtener votos de un dataset
router.get("/:id/votes", async (req, res) => {
  try {
    const datasetId = req.params.id;
    const votes = await datasetRepo.getDatasetVotes(datasetId);

    // Obtener información de usuarios desde MongoDB
    const votesWithUserData = await Promise.all(
      votes.map(async (vote) => {
        const user = await User.findById(vote.userId).select(
          "username nombreCompleto foto"
        );
        return {
          ...vote,
          userName: user?.username || "Usuario desconocido",
          userFullName: user?.nombreCompleto || "",
          userPhoto: user?.foto || null,
        };
      })
    );

    res.json({
      success: true,
      votes: votesWithUserData,
    });
  } catch (error) {
    console.error("Error obteniendo votos:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Obtener voto del usuario actual en un dataset
router.get("/:id/my-vote", async (req, res) => {
  try {
    const datasetId = req.params.id;
    const userId = req.body.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Usuario no especificado",
      });
    }

    const vote = await datasetRepo.getUserVote(userId, datasetId);

    res.json({
      success: true,
      vote: vote,
    });
  } catch (error) {
    console.error("Error obteniendo voto del usuario:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Crear o actualizar voto en un dataset
router.post("/:id/votes", async (req, res) => {
  try {
    const datasetId = req.params.id;
    const { userId, voteType } = req.body;

    if (!userId || !voteType) {
      return res.status(400).json({
        success: false,
        error: "Usuario y tipo de voto son requeridos",
      });
    }

    // Validar que el tipo de voto sea válido
    const validVoteTypes = [
      "Me encanta",
      "Me gusta",
      "No me gusta",
      "Me desagrada",
    ];
    if (!validVoteTypes.includes(voteType)) {
      return res.status(400).json({
        success: false,
        error: "Tipo de voto no válido",
      });
    }

    // Verificar que el dataset existe
    const dataset = await Dataset.findById(datasetId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: "Dataset no encontrado",
      });
    }

    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Usuario no encontrado",
      });
    }

    // Crear o actualizar voto usando repository
    const vote = await datasetRepo.createOrUpdateVote(userId, datasetId, voteType);

    res.status(201).json({
      success: true,
      message: "Voto registrado exitosamente",
      vote: {
        userId: userId,
        voteType: voteType,
        timestamp: vote.timestamp,
        userName: user.username,
        userFullName: user.nombreCompleto,
        userPhoto: user.foto,
      },
    });
  } catch (error) {
    console.error("Error creando/actualizando voto:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Eliminar voto de un usuario
router.delete("/:id/votes", async (req, res) => {
  try {
    const datasetId = req.params.id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "Usuario no especificado",
      });
    }

    await datasetRepo.removeVote(userId, datasetId);

    res.json({
      success: true,
      message: "Voto eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error eliminando voto:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Obtener comentarios con respuestas
router.get("/:id/comments-with-replies", async (req, res) => {
  try {
    const datasetId = req.params.id;
    const comments = await datasetRepo.getDatasetCommentsWithReplies(datasetId);

    // Obtener información de usuarios desde MongoDB para comentarios y respuestas
    const commentsWithUserData = await Promise.all(
      comments.map(async (comment) => {
        const commentUser = await User.findById(comment.userId).select('username nombreCompleto foto');
        
        const repliesWithUserData = await Promise.all(
          comment.replies.map(async (reply) => {
            const replyUser = await User.findById(reply.userId).select('username nombreCompleto foto');
            return {
              ...reply,
              userName: replyUser?.username || 'Usuario desconocido',
              userFullName: replyUser?.nombreCompleto || '',
              userPhoto: replyUser?.foto || null
            };
          })
        );

        return {
          ...comment,
          userName: commentUser?.username || 'Usuario desconocido',
          userFullName: commentUser?.nombreCompleto || '',
          userPhoto: commentUser?.foto || null,
          replies: repliesWithUserData
        };
      })
    );

    res.json({
      success: true,
      comments: commentsWithUserData
    });
  } catch (error) {
    console.error("Error obteniendo comentarios con respuestas:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener respuestas de un comentario específico
router.get("/comments/:commentId/replies", async (req, res) => {
  try {
    const { commentId } = req.params;
    const { datasetId } = req.query;

    if (!datasetId) {
      return res.status(400).json({
        success: false,
        error: "Dataset ID es requerido"
      });
    }

    const replies = await datasetRepo.getCommentReplies(commentId, datasetId);

    const repliesWithUserData = await Promise.all(
      replies.map(async (reply) => {
        const user = await User.findById(reply.userId).select('username nombreCompleto foto');
        return {
          ...reply,
          userName: user?.username || 'Usuario desconocido',
          userFullName: user?.nombreCompleto || '',
          userPhoto: user?.foto || null
        };
      })
    );

    res.json({
      success: true,
      replies: repliesWithUserData
    });
  } catch (error) {
    console.error("Error obteniendo respuestas:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Crear respuesta a un comentario
router.post("/comments/:commentId/replies", async (req, res) => {
  try {
    const { commentId } = req.params;
    const { userId, content, datasetId } = req.body;

    if (!userId || !content || !datasetId) {
      return res.status(400).json({
        success: false,
        error: "Usuario, contenido y dataset son requeridos"
      });
    }

    // Verificar que el dataset existe
    const dataset = await Dataset.findById(datasetId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: "Dataset no encontrado"
      });
    }

    // Verificar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Usuario no encontrado"
      });
    }

    // Crear respuesta usando repository
    const reply = await datasetRepo.createReply(userId, commentId, content, datasetId);

    res.status(201).json({
      success: true,
      message: "Respuesta creada exitosamente",
      reply: {
        ...reply,
        userId: userId,
        content: content,
        userName: user.username,
        userFullName: user.nombreCompleto,
        userPhoto: user.foto
      }
    });

  } catch (error) {
    console.error("Error creando respuesta:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ocultar respuesta (solo admin)
router.patch("/replies/:replyId/hide", async (req, res) => {
  try {
    const { replyId } = req.params;
    await datasetRepo.hideReply(replyId);

    res.json({
      success: true,
      message: "Respuesta ocultada exitosamente"
    });
  } catch (error) {
    console.error("Error ocultando respuesta:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;