// mongo-queries.js
import mongoose from 'mongoose';
import User from '../models/User.js';
import Dataset from '../models/Dataset.js';

// User Queries
export const UserQueries = {
  // Find user by ID
  findById: async (userId) => {
    return await User.findById(userId).select('-password -salt');
  },

  // Find user by email
  findByEmail: async (email) => {
    return await User.findByEmail(email);
  },

  // Find user by username
  findByUsername: async (username) => {
    return await User.findByUsername(username);
  },

  // Get all users
  findAll: async (excludeId = null) => {
    let filter = { tipoUsuario: { $ne: 'admin' } };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    return await User.find(filter).select('-password -salt');
  },

  // Search users
  search: async (query, limit = 20) => {
    return await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { nombreCompleto: { $regex: query, $options: 'i' } }
      ],
      tipoUsuario: { $ne: 'admin' }
    }, 'username nombreCompleto foto').limit(limit);
  },

  // Create user
  create: async (userData) => {
    const user = new User(userData);
    return await user.save();
  },

  // Update user
  update: async (userId, updateData) => {
    return await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -salt');
  },

  // Update user role
  updateRole: async (userId, tipoUsuario) => {
    return await User.findByIdAndUpdate(
      userId,
      { tipoUsuario },
      { new: true, runValidators: true }
    ).select('-password -salt');
  },

  // Get users by IDs
  findByIds: async (userIds) => {
    return await User.find(
      { _id: { $in: userIds } },
      'username nombreCompleto correoElectronico foto fechaNacimiento tipoUsuario'
    );
  }
};

// Dataset Queries
export const DatasetQueries = {
  // Find dataset by ID
  findById: async (datasetId) => {
    return await Dataset.findById(datasetId).populate('creadorId');
  },

  // Find all datasets
  findAll: async () => {
    return await Dataset.find()
      .populate('creadorId', 'username nombreCompleto')
      .sort({ fecha_inclusion: -1 });
  },

  // Find approved datasets
  findApproved: async () => {
    return await Dataset.find({ estado: "aprobado" })
      .populate('creadorId', 'username nombreCompleto')
      .sort({ fecha_inclusion: -1 });
  },

  // Create dataset
  create: async (datasetData) => {
    const dataset = new Dataset(datasetData);
    return await dataset.save();
  },

  // Update dataset
  update: async (datasetId, updateData) => {
    return await Dataset.findByIdAndUpdate(
      datasetId,
      updateData,
      { new: true, runValidators: true }
    );
  },

  // Update dataset state
  updateState: async (datasetId, estado) => {
    return await Dataset.findByIdAndUpdate(
      datasetId,
      { estado },
      { new: true }
    );
  },

  // Increment downloads
  incrementDownloads: async (datasetId) => {
    return await Dataset.findByIdAndUpdate(
      datasetId,
      { $inc: { descargas: 1 } },
      { new: true }
    );
  }
};