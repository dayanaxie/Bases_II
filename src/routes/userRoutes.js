import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import User from '../models/User.js';
import { uploadUser } from "../config/multer.js";
import { apiAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// login 
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validaciones
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario por email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Login exitoso
    res.json({
      success: true,
      message: 'Login exitoso',
      user: {
        _id: user._id,
        username: user.username,
        nombreCompleto: user.nombreCompleto,
        correoElectronico: user.correoElectronico,
        tipoUsuario: user.tipoUsuario, // ← Esto es importante
        foto: user.foto,
        fechaNacimiento: user.fechaNacimiento
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// crear usuario
router.post('/register', uploadUser.single('foto'), async (req, res) => {
  console.log("Datos recibidos:", req.body);
  console.log("Archivo:", req.file);

  try {
    const {
      username,
      nombreCompleto,
      correoElectronico,
      password,
      fechaNacimiento,
      tipoUsuario = 'usuario'
    } = req.body;

    // Validaciones básicas
    if (!username || !nombreCompleto || !correoElectronico || !password || !fechaNacimiento) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Todos los campos obligatorios deben ser proporcionados'
      });
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Validar formato de email
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(correoElectronico)) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'Por favor ingresa un correo electrónico válido'
      });
    }

    // Verificar si el usuario ya existe
    const existingUserByEmail = await User.findByEmail(correoElectronico);
    if (existingUserByEmail) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ya está registrado'
      });
    }

    const existingUserByUsername = await User.findByUsername(username);
    if (existingUserByUsername) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'El username ya está en uso'
      });
    }

    // Crear nuevo usuario
    const newUser = new User({
      foto: req.file ? `/uploads/profile-pictures/${req.file.filename}` : null,
      username,
      nombreCompleto,
      correoElectronico: correoElectronico.toLowerCase(),
      fechaNacimiento,
      tipoUsuario
    });

    // Encriptar contraseña
    await newUser.encryptPassword(password);
    
    // Guardar usuario en la base de datos
    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: newUser
    });

  } catch (error) {
    // Eliminar archivo si hay error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'El username o correo electrónico ya existe'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password -salt');
    
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener los usuarios',
      error: error.message
    });
  }
});

// obtener usuario por id
router.get('/:id',  async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -salt');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// actualziar usuario
router.put('/:id',  uploadUser.single('foto'), async (req, res) => {
  try {
    const {
      username,
      nombreCompleto,
      correoElectronico,
      fechaNacimiento,
      tipoUsuario
    } = req.body;

    // Buscar usuario
    let user = await User.findById(req.params.id);
    
    if (!user) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si el nuevo email ya existe (si se está cambiando)
    if (correoElectronico && correoElectronico !== user.correoElectronico) {
      const existingUser = await User.findByEmail(correoElectronico);
      if (existingUser) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'El correo electrónico ya está registrado'
        });
      }
    }

    // Verificar si el nuevo username ya existe (si se está cambiando)
    if (username && username !== user.username) {
      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'El username ya está en uso'
        });
      }
    }

    // Actualizar campos
    const updateData = {};
    if (username) updateData.username = username;
    if (nombreCompleto) updateData.nombreCompleto = nombreCompleto;
    if (correoElectronico) updateData.correoElectronico = correoElectronico.toLowerCase();
    if (fechaNacimiento) updateData.fechaNacimiento = fechaNacimiento;
    if (tipoUsuario) updateData.tipoUsuario = tipoUsuario;
    
    // Actualizar foto si se proporciona
    if (req.file) {
      // Eliminar foto anterior si existe
      if (user.foto) {
        const oldPhotoPath = path.join(__dirname, '..', user.foto);
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      updateData.foto = `/uploads/profile-pictures/${req.file.filename}`;
    }

    user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -salt');

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      user
    });

  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'El username o correo electrónico ya existe'
      });
    }
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el usuario',
      error: error.message
    });
  }
});


export default router;
