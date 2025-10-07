import mongoose from "mongoose";
import dotenv from "dotenv";
import initAdmin from './initAdmin.js'; // Archivo separado

dotenv.config();

const connectMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("Conectado a MongoDB");

    await initAdmin();

  } catch (error) {
    console.error("Error al conectar a MongoDB:", error);
    process.exit(1);
  }
};

export default connectMongo;