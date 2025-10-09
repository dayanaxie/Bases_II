
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import jwt from 'jsonwebtoken';
import { uploadUser } from "../config/multer.js";
import UserRepository from '../repositories/user-repository.js';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Initialize repository
const userRepo = new UserRepository(mongoose);

// Seguir usuario
router.post('/follow', async (req, res) => {
  try {
    const { followerId, followedId } = req.body;

    if (!followerId || !followedId) {
      return res.status(400).json({
        success: false,
        message: 'followerId y followedId son requeridos'
      });
    }

    await userRepo.followUser(followerId, followedId);

    res.json({
      success: true,
      message: 'Usuario seguido exitosamente'
    });

  } catch (error) {
    console.error('Error en follow:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Dejar de seguir usuario
router.post('/unfollow', async (req, res) => {
  try {
    const { followerId, followedId } = req.body;

    if (!followerId || !followedId) {
      return res.status(400).json({
        success: false,
        message: 'followerId y followedId son requeridos'
      });
    }

    await userRepo.unfollowUser(followerId, followedId);

    res.json({
      success: true,
      message: 'Dejado de seguir exitosamente'
    });

  } catch (error) {
    console.error('Error en unfollow:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Verificar si está siguiendo
router.post('/isfollowing', async (req, res) => {
  try {
    const { followerId, followedId } = req.body;

    if (!followerId || !followedId) {
      return res.status(400).json({
        success: false,
        message: 'followerId y followedId son requeridos'
      });
    }

    const following = await userRepo.isFollowing(followerId, followedId);

    res.json({
      success: true,
      isFollowing: following
    });

  } catch (error) {
    console.error('Error en isFollowing:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// login 
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario por email usando repository
    const user = await userRepo.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await userRepo.verifyUserPassword(email, password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: user._id, tipoUsuario: user.tipoUsuario, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      user: {
        _id: user._id,
        username: user.username,
        nombreCompleto: user.nombreCompleto,
        correoElectronico: user.correoElectronico,
        tipoUsuario: user.tipoUsuario,
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

    // Verificar si el usuario ya existe usando repository
    const existingUserByEmail = await userRepo.getUserByEmail(correoElectronico);
    if (existingUserByEmail) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ya está registrado'
      });
    }

    const existingUserByUsername = await userRepo.getUserByUsername(username);
    if (existingUserByUsername) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'El username ya está en uso'
      });
    }

    // Preparar datos del usuario
    const userData = {
      foto: req.file ? `/uploads/profile-pictures/${req.file.filename}` : null,
      username,
      nombreCompleto,
      correoElectronico: correoElectronico.toLowerCase(),
      fechaNacimiento,
      tipoUsuario,
      password // Repository will handle encryption
    };

    // Crear usuario usando repository
    const newUser = await userRepo.createUser(userData);

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
    const users = await userRepo.getAllUsers();
    
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
router.get('/:id', async (req, res) => {
  try {
    const user = await userRepo.getUserById(req.params.id);
    
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

// actualizar usuario
router.put('/:id', uploadUser.single('foto'), async (req, res) => {
  try {
    const {
      username,
      nombreCompleto,
      correoElectronico,
      fechaNacimiento
    } = req.body;

    // Buscar usuario
    let user = await userRepo.getUserById(req.params.id);
    
    if (!user) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si el nuevo email ya existe
    if (correoElectronico && correoElectronico !== user.correoElectronico) {
      const existingUser = await userRepo.getUserByEmail(correoElectronico);
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

    // Verificar si el nuevo username ya existe
    if (username && username !== user.username) {
      const existingUser = await userRepo.getUserByUsername(username);
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

    // Preparar datos de actualización
    const updateData = {};
    if (username) updateData.username = username;
    if (nombreCompleto) updateData.nombreCompleto = nombreCompleto;
    if (correoElectronico) updateData.correoElectronico = correoElectronico.toLowerCase();
    if (fechaNacimiento) updateData.fechaNacimiento = fechaNacimiento;
    
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

    // Actualizar usuario usando repository
    user = await userRepo.updateUser(req.params.id, updateData);

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

// PATCH /api/users/:id/role - Actualizar el rol de un usuario
router.patch('/:id/tipoUsuario', async (req, res) => {
    try {
        const { id } = req.params;
        const { tipoUsuario } = req.body;

        // Validar que el tipoUsuario sea válido
        if (!tipoUsuario || !['usuario', 'admin'].includes(tipoUsuario)) {
            return res.status(400).json({
                success: false,
                error: 'Tipo de usuario inválido. Debe ser "usuario" o "admin"'
            });
        }

        // Actualizar el usuario usando repository
        const updatedUser = await userRepo.updateUserRole(id, tipoUsuario);

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            message: `Rol actualizado a ${tipoUsuario}`,
            user: updatedUser
        });

    } catch (error) {
        console.error('Error actualizando rol:', error);
        res.status(500).json({
            success: false,
            error: 'Error del servidor al actualizar el rol'
        });
    }
});

// Obtener seguidores de un usuario
router.get('/followers/:userId', async (req, res) => {
  try {
    const { userId } = req.params; 
    
    const followers = await userRepo.getFollowers(userId);
    
    res.json({
      success: true,
      followers: followers
    });

  } catch (error) {
    console.error('Error obteniendo seguidores:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Obtener usuarios seguidos
router.get('/following/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const following = await userRepo.getFollowing(userId);

    res.json({
      success: true,
      following: following
    });

  } catch (error) {
    console.error('Error obteniendo seguidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Buscar usuarios 
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    const users = await userRepo.searchUsers(query);

    res.json({
      success: true,
      users: users
    });

  } catch (error) {
    console.error('Error buscando usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener todos los usuarios para mensajes (excluyendo al usuario actual)
router.get('/messages/users', async (req, res) => {
  try {
    const { exclude } = req.query;
    
    const users = await userRepo.getAllUsers(exclude);

    res.json({
      success: true,
      users: users
    });

  } catch (error) {
    console.error('Error obteniendo usuarios para mensajes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

router.get('/messages/conversation/:otherUserId', async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const { currentUserId } = req.query;

    console.log('🔍 Solicitando conversación:', { currentUserId, otherUserId });

    // Validar parámetros
    if (!currentUserId || !otherUserId) {
      return res.status(400).json({
        success: false,
        message: 'currentUserId y otherUserId son requeridos'
      });
    }

    // Use repository to get conversation
    const conversation = await userRepo.getConversation(currentUserId, otherUserId);

    res.json({
      success: true,
      ...conversation
    });

  } catch (error) {
    console.error('❌ Error obteniendo conversación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al cargar la conversación',
      error: error.message
    });
  }
});

// Enviar mensaje
router.post('/messages/send', async (req, res) => {
  try {
    const { content, sender, receiver } = req.body;

    console.log('📤 Enviando mensaje:', { sender, receiver, content });

    // Use repository to send message
    const responseMessage = await userRepo.sendMessage(content, sender, receiver);

    console.log('✅ Mensaje enviado:', responseMessage._id);

    res.json({
      success: true,
      message: responseMessage,
      info: 'Mensaje enviado y guardado en Neo4j correctamente',
      source: 'neo4j'
    });

  } catch (error) {
    console.error('❌ Error enviando mensaje:', error);
    
    // Handle specific error types
    if (error.message.includes('requeridos') || error.message.includes('vacío')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('no encontrado')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al enviar el mensaje',
      error: error.message
    });
  }
});

// Endpoint de debug para ver todos los mensajes en Neo4j
router.get('/debug/neo4j-messages', async (req, res) => {
  try {
    const messages = await userRepo.getAllNeo4jMessages();
    
    res.json({
      success: true,
      totalMessages: messages.length,
      messages: messages
    });
    
  } catch (error) {
    console.error('Error en debug endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});





export default router;
