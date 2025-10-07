import { requireAuth, getCurrentUser, logout } from './auth.js';

// Variable global para el modal
let userModal = null;

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
    const profileBtn = document.getElementById('profile-btn');
    const messagesBtn = document.getElementById('messages-btn');

    // Event listener para ir a mensajes
    if (messagesBtn) {
        messagesBtn.addEventListener('click', function() {
            window.location.href = '/messages-users';
        });
    }

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

    // Event listener para ir a perfil
    if (profileBtn) {
        profileBtn.addEventListener('click', function() {
            window.location.href = '/profile-user';
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


//-------

// Función para mostrar el modal con información del usuario 
async function showUserModal(user) {
    try {
        // Verificar si el modal ya existe
        let modalOverlay = document.getElementById('modal-overlay');
        
        if (!modalOverlay) {
            // Crear el modal dinámicamente
            modalOverlay = document.createElement('div');
            modalOverlay.id = 'modal-overlay';
            modalOverlay.className = 'modal-overlay';
            modalOverlay.innerHTML = `
                <div class="modal-content">
                    <button class="modal-close" id="modal-close">
                        <i class="fa-solid fa-times"></i>
                    </button>
                    <div class="user-profile">
                        <div class="user-avatar" id="user-avatar">
                            <i class="fa-solid fa-user" id="avatar-placeholder"></i>
                        </div>
                        
                        <div class="user-info-modal">
                            <h2 class="user-name-modal" id="user-name"></h2>
                            <p class="user-username-modal" id="user-username"></p>
                        </div>

                        <!-- Tabs Navigation -->
                        <div class="modal-tabs">
                            <button class="tab-btn active" data-tab="info">
                                <i class="fa-solid fa-info-circle"></i> Información
                            </button>
                            <button class="tab-btn" data-tab="datasets">
                                <i class="fa-solid fa-database"></i> Datasets
                            </button>
                        </div>

                        <!-- Tab Content -->
                        <div class="tab-content active" id="info-tab">
                            <div class="user-details">
                                <div class="detail-item">
                                    <div class="detail-icon">
                                        <i class="fa-solid fa-envelope"></i>
                                    </div>
                                    <div class="detail-label">Email:</div>
                                    <div class="detail-value" id="user-email"></div>
                                </div>
                                
                                <div class="detail-item">
                                    <div class="detail-icon">
                                        <i class="fa-solid fa-cake-candles"></i>
                                    </div>
                                    <div class="detail-label">Fecha Nacimiento:</div>
                                    <div class="detail-value" id="user-birthdate"></div>
                                </div>
                                
                                <div class="detail-item">
                                    <div class="detail-icon">
                                        <i class="fa-solid fa-calendar"></i>
                                    </div>
                                    <div class="detail-label">Edad:</div>
                                    <div class="detail-value" id="user-age"></div>
                                </div>

                                <div class="detail-item">
                                    <div class="detail-icon">
                                        <i class="fa-solid fa-database"></i>
                                    </div>
                                    <div class="detail-label">Datasets:</div>
                                    <div class="detail-value" id="user-datasets-count">0</div>
                                </div>
                            </div>
                            
                            <div class="follow-section">
                                <button class="follow-btn" id="follow-btn">
                                    <i class="fa-solid fa-user-plus"></i> Seguir
                                </button>
                            </div>
                        </div>

                        <div class="tab-content" id="datasets-tab">
                            <div class="user-datasets">
                                <div class="dataset-list" id="datasets-list">
                                    <!-- Los datasets se cargarán aquí -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modalOverlay);
            
            // Cargar el CSS del modal si no está cargado
            loadModalCSS();
        }

        // Ahora usar la clase UserModal para manejar el modal
        import('./user-modal.js').then(module => {
            const UserModal = module.default;
            const modal = new UserModal();
            modal.show(user);
        }).catch(error => {
            console.error('Error cargando el modal:', error);
            // Fallback: usar función simple
            showSimpleModal(user, modalOverlay);
        });
        
    } catch (error) {
        console.error('Error cargando el modal:', error);
        // Fallback: mostrar información básica
        alert(`Usuario: ${user.nombreCompleto}\nEmail: ${user.correoElectronico}`);
    }
}

// Función para cargar el CSS del modal dinámicamente
function loadModalCSS() {
    // Verificar si el CSS ya está cargado
    if (document.getElementById('modal-css')) return;
    
    const link = document.createElement('link');
    link.id = 'modal-css';
    link.rel = 'stylesheet';
    link.href = './css/user-modal.css';
    document.head.appendChild(link);
}

// Función de fallback simple
function showSimpleModal(user, modalOverlay) {
    // Llenar datos básicos
    document.getElementById('user-name').textContent = user.nombreCompleto || user.username;
    document.getElementById('user-username').textContent = `@${user.username}`;
    document.getElementById('user-email').textContent = user.correoElectronico;
    
    // Fecha y edad
    const birthdate = formatDate(user.fechaNacimiento);
    const age = calculateAge(user.fechaNacimiento);
    document.getElementById('user-birthdate').textContent = birthdate;
    document.getElementById('user-age').textContent = `${age} años`;
    
    // Avatar
    setUserAvatar(user);
    
    // Mostrar modal
    modalOverlay.classList.add('active');
    
    // Configurar event listeners básicos
    setupBasicModalEvents(modalOverlay, user);
}

// Funciones de utilidad para el fallback
function formatDate(dateString) {
    if (!dateString) return 'No especificada';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

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

function setUserAvatar(user) {
    const avatarContainer = document.getElementById('user-avatar');
    if (user.foto && user.foto !== 'null' && user.foto !== 'undefined') {
        avatarContainer.innerHTML = '';
        const img = document.createElement('img');
        img.src = `http://localhost:3000${user.foto}`;
        img.alt = user.nombreCompleto || user.username;
        img.onerror = () => {
            avatarContainer.innerHTML = '<i class="fa-solid fa-user" id="avatar-placeholder"></i>';
        };
        avatarContainer.appendChild(img);
    } else {
        avatarContainer.innerHTML = '<i class="fa-solid fa-user" id="avatar-placeholder"></i>';
    }
}

function setupBasicModalEvents(modalOverlay, user) {
    // Cerrar modal
    const closeBtn = document.getElementById('modal-close');
    const followBtn = document.getElementById('follow-btn');
    
    closeBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });
    
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    });
    
    document.addEventListener('keydown', function closeOnEscape(e) {
        if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
            modalOverlay.classList.remove('active');
            document.removeEventListener('keydown', closeOnEscape);
        }
    });
    
    // Botón seguir
    followBtn.addEventListener('click', () => {
        followBtn.disabled = true;
        followBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
        
        setTimeout(() => {
            followBtn.disabled = false;
            followBtn.innerHTML = '<i class="fa-solid fa-check"></i> Siguiendo';
            followBtn.classList.add('following');
            console.log(`Siguiendo al usuario: ${user.username}`);
        }, 1500);
    });
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
 