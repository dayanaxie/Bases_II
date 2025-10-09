// initTestData.js
import User from '../models/User.js';
import Dataset from '../models/Dataset.js';
import { createUserReferenceInNeo4j, createDatasetReferenceInNeo4j, followUser, followDataset } from '../config/neo4j.js';

async function createAdminUser() {
  const existingAdmin = await User.findOne({ 
    $or: [
      { username: 'admin' },
      { correoElectronico: 'admin@gmail.com' }
    ]
  });

  if (existingAdmin) {
    console.log('👤 Usuario admin ya existe');
    return existingAdmin;
  }

  const adminUser = new User({
    username: 'admin',
    nombreCompleto: 'Administrador del Sistema',
    correoElectronico: 'admin@gmail.com',
    fechaNacimiento: new Date('1990-01-01'),
    tipoUsuario: 'admin'
  });

  await adminUser.encryptPassword('admin123');
  await adminUser.save();
  
  // Crear referencia en Neo4j
  try {
    await createUserReferenceInNeo4j(adminUser._id);
    console.log('✅ Referencia de admin creada en Neo4j');
  } catch (error) {
    console.log('⚠️ Error creando referencia de admin en Neo4j:', error.message);
  }

  console.log('👤 Usuario admin creado exitosamente!');
  console.log('   Email: admin@gmail.com');
  console.log('   Password: admin123');
  
  return adminUser;
}

async function createTestUsers() {
  const testUsersData = [
    {
      username: 'maria_garcia',
      nombreCompleto: 'María García López',
      correoElectronico: 'maria.garcia@email.com',
      fechaNacimiento: new Date('1992-05-15'),
      tipoUsuario: 'usuario',
      password: 'password123'
    },
    {
      username: 'carlos_rod',
      nombreCompleto: 'Carlos Rodríguez Méndez',
      correoElectronico: 'carlos.rodriguez@email.com',
      fechaNacimiento: new Date('1988-11-23'),
      tipoUsuario: 'usuario',
      password: 'password123'
    },
    {
      username: 'ana_martinez',
      nombreCompleto: 'Ana Martínez Sánchez',
      correoElectronico: 'ana.martinez@email.com',
      fechaNacimiento: new Date('1995-03-08'),
      tipoUsuario: 'usuario',
      password: 'password123'
    },
    {
      username: 'javier_lopez',
      nombreCompleto: 'Javier López Torres',
      correoElectronico: 'javier.lopez@email.com',
      fechaNacimiento: new Date('1990-07-19'),
      tipoUsuario: 'usuario',
      password: 'password123'
    }
  ];

  const createdUsers = [];

  for (const userData of testUsersData) {
    const existingUser = await User.findOne({
      $or: [
        { username: userData.username },
        { correoElectronico: userData.correoElectronico }
      ]
    });

    if (existingUser) {
      console.log(`👤 Usuario ${userData.username} ya existe`);
      createdUsers.push(existingUser);
      continue;
    }

    const user = new User({
      username: userData.username,
      nombreCompleto: userData.nombreCompleto,
      correoElectronico: userData.correoElectronico,
      fechaNacimiento: userData.fechaNacimiento,
      tipoUsuario: userData.tipoUsuario
    });

    await user.encryptPassword(userData.password);
    await user.save();
    
    // Crear referencia en Neo4j
    try {
      await createUserReferenceInNeo4j(user._id);
      console.log(`✅ Referencia de ${userData.username} creada en Neo4j`);
    } catch (error) {
      console.log(`⚠️ Error creando referencia de ${userData.username} en Neo4j:`, error.message);
    }

    console.log(`👤 Usuario ${userData.username} creado exitosamente!`);
    createdUsers.push(user);
  }

  return createdUsers;
}

async function createTestDatasets(users) {
  const testDatasetsData = [
    {
      nombre: 'Dataset de Análisis de Sentimientos en Redes Sociales',
      descripcion: 'Colección de tweets etiquetados para análisis de sentimientos usando machine learning. Incluye datos en español e inglés.',
      estado: 'aprobado',
      tamano: 45.2,
      descargas: 124,
      creadorId: users[0]._id // maria_garcia
    },
    {
      nombre: 'Imágenes Médicas para Detección de COVID-19',
      descripcion: 'Dataset de radiografías de tórax para entrenar modelos de detección temprana de COVID-19 y otras enfermedades pulmonares.',
      estado: 'aprobado',
      tamano: 256.8,
      descargas: 89,
      creadorId: users[1]._id // carlos_rod
    },
    {
      nombre: 'Datos Climáticos Históricos 2000-2023',
      descripcion: 'Registros climáticos diarios de múltiples estaciones meteorológicas a nivel mundial. Ideal para modelos predictivos.',
      estado: 'aprobado',
      tamano: 78.5,
      descargas: 67,
      creadorId: users[2]._id // ana_martinez
    },
    {
      nombre: 'Transcripciones de Llamadas de Servicio al Cliente',
      descripcion: 'Dataset anonimizado de transcripciones para análisis de calidad de servicio y clasificación de intenciones.',
      estado: 'pendiente',
      tamano: 12.3,
      descargas: 23,
      creadorId: users[3]._id // javier_lopez
    },
    {
      nombre: 'Imágenes de Productos para E-commerce',
      descripcion: 'Colección de imágenes de productos con etiquetas para entrenar modelos de clasificación y detección de objetos.',
      estado: 'aprobado',
      tamano: 189.6,
      descargas: 156,
      creadorId: users[0]._id // maria_garcia
    }
  ];

  const createdDatasets = [];

  for (const datasetData of testDatasetsData) {
    const existingDataset = await Dataset.findOne({
      nombre: datasetData.nombre,
      creadorId: datasetData.creadorId
    });

    if (existingDataset) {
      console.log(`📊 Dataset "${datasetData.nombre}" ya existe`);
      createdDatasets.push(existingDataset);
      continue;
    }

    const dataset = new Dataset(datasetData);
    await dataset.save();
    
    // Crear referencia en Neo4j
    try {
      await createDatasetReferenceInNeo4j(
        dataset._id,
        dataset.nombre,
        dataset.creadorId
      );
      console.log(`Referencia de dataset "${datasetData.nombre}" creada en Neo4j`);
    } catch (error) {
      console.log(`Error creando referencia de dataset en Neo4j:`, error.message);
    }

    console.log(`Dataset "${datasetData.nombre}" creado exitosamente!`);
    createdDatasets.push(dataset);
  }

  return createdDatasets;
}

async function createTestRelationships(users, datasets) {
  console.log('Creando relaciones de seguimiento...');
  
  try {
    // María sigue a Carlos y Ana
    await followUser(users[0]._id, users[1]._id); // maria -> carlos
    await followUser(users[0]._id, users[2]._id); // maria -> ana
    
    // Carlos sigue a María y Javier
    await followUser(users[1]._id, users[0]._id); // carlos -> maria
    await followUser(users[1]._id, users[3]._id); // carlos -> javier
    
    // Ana sigue a María
    await followUser(users[2]._id, users[0]._id); // ana -> maria
    
    // Javier sigue a Carlos y Ana
    await followUser(users[3]._id, users[1]._id); // javier -> carlos
    await followUser(users[3]._id, users[2]._id); // javier -> ana

    // Usuarios siguen datasets
    await followDataset(users[0]._id, datasets[1]._id); // maria sigue dataset COVID
    await followDataset(users[1]._id, datasets[0]._id); // carlos sigue dataset sentimientos
    await followDataset(users[2]._id, datasets[4]._id); // ana sigue dataset e-commerce
    await followDataset(users[3]._id, datasets[2]._id); // javier sigue dataset climático
    
    console.log('Relaciones de seguimiento creadas exitosamente!');
  } catch (error) {
    console.log('Error creando relaciones de seguimiento:', error.message);
  }
}

export async function initTestData() {
  try {
    console.log('Inicializando datos de prueba...');
    await createAdminUser();
    const testUsers = await createTestUsers();
    const testDatasets = await createTestDatasets(testUsers);
    await createTestRelationships(testUsers, testDatasets);
    
    console.log('Datos de prueba inicializados exitosamente!');
    return { testUsers, testDatasets };
  } catch (error) {
    console.log('Error inicializando datos de prueba:', error.message);
    throw error;
  }
}

// Export the individual functions as well
export { createTestUsers, createTestDatasets, createTestRelationships, initTestData };