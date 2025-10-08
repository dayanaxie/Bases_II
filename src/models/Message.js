import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índice para búsquedas eficientes de conversaciones
messageSchema.index({ sender: 1, receiver: 1, timestamp: 1 });
messageSchema.index({ receiver: 1, sender: 1, timestamp: 1 });

// Método estático para obtener conversación entre dos usuarios
messageSchema.statics.getConversation = async function(user1Id, user2Id) {
  try {
    const messages = await this.find({
      $or: [
        { sender: user1Id, receiver: user2Id },
        { sender: user2Id, receiver: user1Id }
      ]
    })
    .populate('sender', 'username nombreCompleto foto')
    .populate('receiver', 'username nombreCompleto foto')
    .sort({ timestamp: 1 })
    .lean();

    return messages;
  } catch (error) {
    throw new Error(`Error obteniendo conversación: ${error.message}`);
  }
};

// Método estático para enviar mensaje
messageSchema.statics.sendMessage = async function(content, senderId, receiverId) {
  try {
    const message = new this({
      content,
      sender: senderId,
      receiver: receiverId
    });

    await message.save();
    
    // Populate para retornar datos completos
    await message.populate('sender', 'username nombreCompleto foto');
    await message.populate('receiver', 'username nombreCompleto foto');
    
    return message;
  } catch (error) {
    throw new Error(`Error enviando mensaje: ${error.message}`);
  }
};

// Método para verificar si hay mensajes entre dos usuarios
messageSchema.statics.hasMessagesBetween = async function(user1Id, user2Id) {
  try {
    const count = await this.countDocuments({
      $or: [
        { sender: user1Id, receiver: user2Id },
        { sender: user2Id, receiver: user1Id }
      ]
    });
    
    return count > 0;
  } catch (error) {
    throw new Error(`Error verificando mensajes: ${error.message}`);
  }
};

const Message = mongoose.model('Message', messageSchema);

export default Message;