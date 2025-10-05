import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear directorios si no existen
const createDirectories = () => {
  const directories = [
    path.join(__dirname, '../uploads/profile-pictures'),
    path.join(__dirname, '../uploads/dataset-images'),
    path.join(__dirname, '../uploads/dataset-videos'),
    path.join(__dirname, '../uploads/dataset-files')
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createDirectories();

// Configuración de multer para USUARIOS (fotos de perfil)
const userStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/profile-pictures'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'user-' + uniqueSuffix + extension);
  }
});

// Configuración de multer para DATASETS
const datasetStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = '';
    
    // Determinar la carpeta según el tipo de archivo
    if (file.fieldname === 'foto') {
      uploadPath = path.join(__dirname, '../uploads/dataset-images');
    } else if (file.fieldname === 'video_guia') {
      uploadPath = path.join(__dirname, '../uploads/dataset-videos');
    } else if (file.fieldname === 'archivos') {
      uploadPath = path.join(__dirname, '../uploads/dataset-files');
    } else {
      uploadPath = path.join(__dirname, '../uploads/other');
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'dataset-' + uniqueSuffix + extension);
  }
});

// Filtros de archivos para USUARIOS
const userFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, GIF, etc.)'), false);
  }
};

// Filtros de archivos para DATASETS
const datasetFileFilter = (req, file, cb) => {
  if (file.fieldname === 'foto') {
    // Solo imágenes para el campo 'foto'
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen para la foto del dataset'), false);
    }
  } else if (file.fieldname === 'video_guia') {
    // Solo videos para el campo 'video_guia'
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de video para la guía'), false);
    }
  } else if (file.fieldname === 'archivos') {
    // Cualquier tipo de archivo para los archivos del dataset
    cb(null, true);
  } else {
    cb(new Error('Campo de archivo no reconocido'), false);
  }
};

// Configuraciones de multer
const uploadUser = multer({
  storage: userStorage,
  fileFilter: userFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo para fotos de perfil
  }
});

const uploadDataset = multer({
  storage: datasetStorage,
  fileFilter: datasetFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB máximo para archivos de datasets
  }
});

// Exportar ambas configuraciones
export { uploadUser, uploadDataset };

// Export por defecto para mantener compatibilidad con código existente
export default uploadUser;