import mongoose from "mongoose";
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  foto: {
    type: String,
    default: null
  },
  username: {
    type: String,
    required: [true, 'El username es obligatorio'],
    unique: true,
    trim: true,
    minlength: [3, 'El username debe tener al menos 3 caracteres'],
    maxlength: [30, 'El username no puede tener más de 30 caracteres']
  },
  nombreCompleto: {
    type: String,
    required: [true, 'El nombre completo es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede tener más de 100 caracteres']
  },
  correoElectronico: {
    type: String,
    required: [true, 'El correo electrónico es obligatorio'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor ingresa un correo válido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es obligatoria'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
  },
  salt: {
    type: String,
    required: true
  },
  fechaNacimiento: {
    type: Date,
    required: [true, 'La fecha de nacimiento es obligatoria'],
  },
  tipoUsuario: {
    type: String,
    enum: ['usuario', 'admin'],
    default: 'usuario'
  }
});

// Encriptar contraseña
userSchema.methods.encryptPassword = async function(password) {
  const saltRounds = 12;
  this.salt = await bcrypt.genSalt(saltRounds);
  this.password = await bcrypt.hash(password, this.salt);
  return this.password;
};

userSchema.methods.verifyPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.contraseña;
  delete userObject.salt;
  delete userObject.__v;
  return userObject;
};

userSchema.statics.findByEmail = function(email) {
  return this.findOne({ correoElectronico: email.toLowerCase() });
};

userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username });
};

export default mongoose.model("User", userSchema);
