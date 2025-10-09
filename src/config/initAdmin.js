import User from '../models/User.js';

async function initAdmin() {
  try {
    console.log('Verificando usuario admin...');
    
    // Pequeña pausa para asegurar que la DB esté lista
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const existingAdmin = await User.findOne({ 
      $or: [
        { username: 'admin' },
        { correoElectronico: 'admin@gmail.com' }
      ]
    });

    if (existingAdmin) {
      console.log('Usuario admin ya existe');
      console.log('Email: admin@gmail.com');
      console.log('Password: admin123');
      return;
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

    console.log('Usuario admin creado exitosamente!');
    console.log('Email: admin@gmail.com');
    console.log('Password: admin123');

  } catch (error) {
    console.log('Error creando usuario admin:', error.message);
  }
}

export default initAdmin;