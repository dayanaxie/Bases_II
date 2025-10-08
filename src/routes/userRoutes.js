// userRoutes.js - VERSIÓN CORREGIDA
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import User from '../models/User.js';
import { uploadUser } from "../config/multer.js";
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { 
  createUserReferenceInNeo4j, 
  followUser, 
  unfollowUser, 
  isFollowing, 
  getFollowers, 
  getFollowing,
  sendMessage, 
  getMessagesBetweenUsers, 
  hasMessagesBetween
} from '../config/neo4j.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

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

    await followUser(followerId, followedId);

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

    await unfollowUser(followerId, followedId);

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

    const following = await isFollowing(followerId, followedId);

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

    // 🔒 Generar token JWT
    const token = jwt.sign(
      { id: user._id, tipoUsuario: user.tipoUsuario, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '2h' } // Token válido por 2 horas
    );

    // ✅ Responder con token y datos del usuario
    res.json({
      success: true,
      message: 'Login exitoso',
      token, // ← aquí va el token
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

    // Crear referencia en Neo4j (solo el ID)
    try {
      await createUserReferenceInNeo4j(newUser._id);
      console.log('✅ Referencia de usuario creada en Neo4j');
    } catch (neo4jError) {
      console.error('⚠️ Usuario creado en MongoDB pero falló en Neo4j:', neo4jError.message);
      // No fallamos la petición completa si Neo4j falla
    }

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
      fechaNacimiento
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

        // Verificar que el usuario existe
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }
        // Actualizar el usuario
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { tipoUsuario },
            { new: true, runValidators: true }
        ).select('-password');

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
// Obtener seguidores de un usuario con datos completos - CORREGIDO
router.get('/followers/:userId', async (req, res) => {
  try {
    const { userId } = req.params; 
    
    // Obtener IDs de seguidores desde Neo4j
    const followerIds = await getFollowers(userId); 
    
    if (followerIds.length === 0) { 
      return res.json({
        success: true,
        followers: []
      });
    }

    // Convertir strings a ObjectId
    const objectIds = followerIds.map(id => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (error) {
        console.error('❌ Error convirtiendo ID:', id, error);
        return null;
      }
    }).filter(id => id !== null);

    // Obtener datos completos de los seguidores desde MongoDB
    const followers = await User.find(
      { _id: { $in: objectIds } },
      'username nombreCompleto correoElectronico foto fechaNacimiento tipoUsuario'
    );

    res.json({
      success: true,
      followers: followers
    });

  } catch (error) {
    console.error('❌ Error obteniendo seguidores:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Obtener usuarios seguidos con datos completos - CORREGIDO
router.get('/following/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    
    // Obtener IDs de usuarios seguidos desde Neo4j
    const followingIds = await getFollowing(userId);
    
    
    if (followingIds.length === 0) {
      return res.json({
        success: true,
        following: []
      });
    }

    // Convertir strings a ObjectId
    const objectIds = followingIds.map(id => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (error) {
        console.error('❌ Error convirtiendo ID:', id, error);
        return null;
      }
    }).filter(id => id !== null);
    

    // Obtener datos completos de los usuarios seguidos desde MongoDB
    const following = await User.find(
      { _id: { $in: objectIds } },
      'username nombreCompleto correoElectronico foto fechaNacimiento tipoUsuario'
    );


    res.json({
      success: true,
      following: following
    });

  } catch (error) {
    console.error('❌ Error obteniendo seguidos:', error);
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
    
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { nombreCompleto: { $regex: query, $options: 'i' } }
      ],
      tipoUsuario: { $ne: 'admin' } // Excluir administradores
    }, 'username nombreCompleto foto').limit(20);

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
    const { exclude } = req.query; // ID del usuario actual a excluir
    
    let filter = { tipoUsuario: { $ne: 'admin' } };
    if (exclude) {
      filter._id = { $ne: exclude };
    }

    const users = await User.find(filter, 'username nombreCompleto foto correoElectronico')
      .sort({ nombreCompleto: 1 });

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


// Obtener conversación entre dos usuarios DESDE NEO4J
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

    // Verificar si existen mensajes entre estos usuarios en Neo4j
    const hasMessages = await hasMessagesBetween(currentUserId, otherUserId);
    console.log('¿Hay mensajes?', hasMessages);
    
    if (!hasMessages) {
      return res.json({
        success: true,
        messages: [],
        hasMessages: false,
        message: 'No hay mensajes entre estos usuarios'
      });
    }

    // Obtener la conversación completa desde Neo4j
    const messages = await getMessagesBetweenUsers(currentUserId, otherUserId);
    console.log('Mensajes obtenidos:', messages.length);

    // Formatear los mensajes para el frontend
    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      content: msg.content,
      sender: msg.sender,
      receiver: msg.receiver,
      timestamp: msg.timestamp,
      read: msg.read
    }));

    res.json({
      success: true,
      messages: formattedMessages,
      hasMessages: true,
      count: formattedMessages.length,
      source: 'neo4j'
    });

  } catch (error) {
    console.error('❌ Error obteniendo conversación desde Neo4j:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al cargar la conversación',
      error: error.message
    });
  }
});

// Enviar mensaje Y GUARDAR EN NEO4J
router.post('/messages/send', async (req, res) => {
  try {
    const { content, sender, receiver } = req.body;

    console.log('📤 Enviando mensaje:', { sender, receiver, content });

    // Validaciones
    if (!content || !sender || !receiver) {
      return res.status(400).json({
        success: false,
        message: 'Contenido, remitente y destinatario son requeridos'
      });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El mensaje no puede estar vacío'
      });
    }

    // Verificar que los usuarios existan
    const senderUser = await User.findById(sender);
    const receiverUser = await User.findById(receiver);

    if (!senderUser || !receiverUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuario remitente o destinatario no encontrado'
      });
    }

    // Generar ID único para el mensaje
    const messageId = new mongoose.Types.ObjectId();

    // Enviar el mensaje a Neo4j
    await sendMessage(sender, receiver, content.trim(), messageId);

    // Formatear respuesta
    const responseMessage = {
      _id: messageId.toString(),
      content: content.trim(),
      sender: sender,
      receiver: receiver,
      timestamp: new Date(),
      read: false
    };

    console.log('✅ Mensaje guardado en Neo4j:', responseMessage._id);

    res.json({
      success: true,
      message: responseMessage,
      info: 'Mensaje enviado y guardado en Neo4j correctamente',
      source: 'neo4j'
    });

  } catch (error) {
    console.error('❌ Error enviando mensaje a Neo4j:', error);
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
    const session = driver.session();
    
    const result = await session.run(`
      MATCH (u1:User)-[r:MESSAGE]->(u2:User)
      RETURN u1.mongoId as sender, 
             u2.mongoId as receiver, 
             r.content as content,
             r.timestamp as timestamp,
             r.messageId as messageId
      ORDER BY r.timestamp DESC
    `);
    
    const messages = result.records.map(record => ({
      sender: record.get('sender'),
      receiver: record.get('receiver'),
      content: record.get('content'),
      timestamp: record.get('timestamp'),
      messageId: record.get('messageId')
    }));
    
    await session.close();
    
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
