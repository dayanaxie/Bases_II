import mongoose from "mongoose";

const datasetSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String, required: true },
  fecha_inclusion: { type: Date, default: Date.now },
  foto: { type: String },              // URL o base64
  archivos: [{ type: String }],        // nombres o rutas de archivos
  video_guia: { type: String },        // URL o base64
  estado: {
    type: String,
    enum: ["pendiente", "aprobado", "desactivado"],
    default: "pendiente"               // cuando se crea
  },
  tamano: { type: Number, default: 0 },  // en bytes o MB
  descargas: { type: Number, default: 0 },
  creadorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

export default mongoose.model("Dataset", datasetSchema);
