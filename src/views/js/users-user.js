import { requireAuth, getCurrentUser, logout } from './auth.js';

document.addEventListener("DOMContentLoaded", async () => {
    // Verificar autenticación
    if (!requireAuth()) return;
     
    const currentUser = getCurrentUser();
    
    // Si es admin, redirigir a la vista de admin
    if (currentUser.tipoUsuario === 'admin') {
        window.location.href = '/datasetsAdmin'; // Asumiendo que tienes una ruta para admin
        return;
    }

    // Configurar botones
    const logoutBtn = document.getElementById('logout-btn');
    const datasetsBtn = document.getElementById('datasets-btn');

    // Event listener para logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Event listener para ir a datasets
    if (datasetsBtn) {
        datasetsBtn.addEventListener('click', function() {
            window.location.href = '/datasetsUser';
        });
    }

    // Cargar usuarios (versión simple con datos mock)
    // loadUsers();
    loadRealUsers(currentUser);
});

// Función para cargar usuarios reales desde la API
async function loadRealUsers(currentUser) {
    const container = document.getElementById("users");
    if (!container) return;

    try {
        container.innerHTML = '<div class="loading">Cargando usuarios...</div>';
        
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3000/api/users', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar los usuarios');
        }
        
        const result = await response.json();
        
        if (result.success && result.users) {
            // Filtrar usuarios: excluir administradores y el usuario actual
            const filteredUsers = result.users.filter(user => 
                user.tipoUsuario !== 'admin' && 
                user._id !== currentUser._id
            );
            
            renderUsers(filteredUsers);
        } else {
            throw new Error('Formato de respuesta inválido');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showErrorMessage('Error al cargar los usuarios. Intenta nuevamente.');
    }
}


// Función simple para cargar usuarios
function loadUsers() {
    const container = document.getElementById("users");
    if (!container) return;

    // Datos de ejemplo simples
    const usersMock = [
        { id: 1, userName: "Jose Perez" },
        { id: 2, userName: "Ana Smith" },
        { id: 3, userName: "Karen Rodriguez" }
    ];

    renderUsers(usersMock);
}

// Render de usuarios
function renderUsers(users) {
    const container = document.getElementById("users");
    if (!container) return;

    container.innerHTML = "";

    if (!users || users.length === 0) {
        container.innerHTML = `
            <div class="no-users">
                <div class="no-users-icon">
                    <i class="fa-solid fa-users"></i>
                </div>
                <h3>No hay usuarios disponibles</h3> 
            </div>
        `;
        return;
    }

    users.forEach(user => {
        const card = document.createElement("div");
        card.classList.add("user-card");

        const info = document.createElement("div");
        info.classList.add("user-info");
        // info.innerHTML = `
        //     <h2 class="user-name">${user.nombreCompleto || user.username}</h2>
        //     <p class="user-username">@${user.username}</p>
        //     ${user.correoElectronico ? `<p class="user-email">${user.correoElectronico}</p>` : ''}
        // `;
        info.innerHTML = `
            <h2 class="user-name">${user.username || user.nombreCompleto}</h2>
        `;

        const actions = document.createElement("div");
        actions.classList.add("user-actions");

        const viewBtn = document.createElement("button");
        viewBtn.classList.add("btn", "view");
        viewBtn.innerHTML = `<i class="fa-solid fa-eye"></i>`;
        viewBtn.addEventListener('click', () => showUserModal(user));

        actions.appendChild(viewBtn);
        card.appendChild(info);
        card.appendChild(actions);
        container.appendChild(card);
    });
}

// Función para ver usuario
function viewUser(user) {
    // Mostrar información del usuario en un alert o modal
    const userInfo = `
        Información del usuario:
                
        Nombre: ${user.nombreCompleto}
        Username: @${user.username}
        Email: ${user.correoElectronico}
        Tipo: ${user.tipoUsuario === 'admin' ? 'Administrador' : 'Usuario'}
        ${user.fechaNacimiento ? `Fecha Nacimiento: ${new Date(user.fechaNacimiento).toLocaleDateString()}` : ''}
    `;
    
    alert(userInfo);
    
    // Alternativa: podrías redirigir a una página de perfil
    // window.location.href = `/user/${user._id}`;
}

//-------

// Función para mostrar el modal con información del usuario
function showUserModal(user) {
    // Crear overlay del modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    // Determinar qué mostrar en el avatar
    let avatarHTML = '';
    if (user.foto && user.foto !== 'null' && user.foto !== 'undefined') {
        // Verificar si la ruta de la foto es válida
        const fullImageUrl = `http://localhost:3000${user.foto}`;
        avatarHTML = `<img src="${fullImageUrl}" alt="${user.nombreCompleto}" 
                      onerror="this.parentElement.innerHTML='<i class=\\'fa-solid fa-user\\'></i>'" />`;
    } else {
        avatarHTML = '<i class="fa-solid fa-user"></i>';
    }
    
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <button class="modal-close">
                <i class="fa-solid fa-times"></i>
            </button>
            <div class="user-profile">
                <div class="user-avatar">
                    ${avatarHTML}
                </div>
                
                <div class="user-info-modal">
                    <h2 class="user-name-modal">${user.nombreCompleto || user.username}</h2>
                    <p class="user-username-modal">@${user.username}</p>
                </div>
                
                <div class="user-details">
                    <div class="detail-item">
                        <div class="detail-icon">
                            <i class="fa-solid fa-envelope"></i>
                        </div>
                        <div class="detail-label">Email:</div>
                        <div class="detail-value">${user.correoElectronico}</div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-icon">
                            <i class="fa-solid fa-cake-candles"></i>
                        </div>
                        <div class="detail-label">Fecha Nacimiento:</div>
                        <div class="detail-value">${formatDate(user.fechaNacimiento)}</div>
                    </div>
                    
                    <div class="detail-item">
                        <div class="detail-icon">
                            <i class="fa-solid fa-calendar"></i>
                        </div>
                        <div class="detail-label">Edad:</div>
                        <div class="detail-value">${calculateAge(user.fechaNacimiento)} años</div>
                    </div>
                </div>
                
                <div class="follow-section">
                    <button class="follow-btn" id="follow-user-btn">
                        <i class="fa-solid fa-user-plus"></i> Seguir
                    </button>
                </div>
            </div>
        </div>
    `;

    // Agregar al documento
    document.body.appendChild(modalOverlay);

    // Mostrar modal con animación
    setTimeout(() => {
        modalOverlay.classList.add('active');
    }, 10);

    // Configurar event listeners del modal
    const closeBtn = modalOverlay.querySelector('.modal-close');
    const followBtn = modalOverlay.querySelector('#follow-user-btn');

    // Cerrar modal al hacer clic en la X
    closeBtn.addEventListener('click', () => {
        closeModal(modalOverlay);
    });

    // Cerrar modal al hacer clic fuera del contenido
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal(modalOverlay);
        }
    });

    // Funcionalidad del botón seguir (placeholder)
    followBtn.addEventListener('click', () => {
        handleFollowUser(user, followBtn);
    });

    // Cerrar con tecla Escape
    document.addEventListener('keydown', function closeOnEscape(e) {
        if (e.key === 'Escape') {
            closeModal(modalOverlay);
            document.removeEventListener('keydown', closeOnEscape);
        }
    });
}

// Función para cerrar el modal
function closeModal(modalOverlay) {
    modalOverlay.classList.remove('active');
    setTimeout(() => {
        if (modalOverlay.parentNode) {
            modalOverlay.parentNode.removeChild(modalOverlay);
        }
    }, 300);
}

// Función para manejar el "seguir" usuario
function handleFollowUser(user, followBtn) {
    // Cambiar estado del botón
    followBtn.disabled = true;
    followBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
    
    // Simular llamada a API (placeholder)
    setTimeout(() => {
        followBtn.disabled = false;
        followBtn.innerHTML = '<i class="fa-solid fa-check"></i> Siguiendo';
        followBtn.classList.add('following');
        
        // Aquí iría la llamada real a la API para seguir al usuario
        console.log(`Siguiendo al usuario: ${user.username} (ID: ${user._id})`);
        
        // Podrías agregar aquí:
        // fetch(`/api/users/${user._id}/follow`, { method: 'POST' })
        //   .then(response => response.json())
        //   .then(data => {
        //       if (data.success) {
        //           followBtn.innerHTML = '<i class="fa-solid fa-check"></i> Siguiendo';
        //           followBtn.classList.add('following');
        //       }
        //   });
    }, 1500);
}

// Función para formatear fecha
function formatDate(dateString) {
    if (!dateString) return 'No especificada';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Función para calcular edad
function calculateAge(dateString) {
    if (!dateString) return '--';
    
    const birthDate = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

// Mensaje de error
function showErrorMessage(message) {
    const container = document.getElementById("users");
    if (!container) return;

    container.innerHTML = `
        <div class="error-message">
            <div class="error-icon">
                <i class="fa-solid fa-exclamation-triangle"></i>
            </div>
            <h3>Error</h3>
            <p>${message}</p>
            <button class="retry-btn" onclick="location.reload()">Reintentar</button>
        </div>
    `;
}
 