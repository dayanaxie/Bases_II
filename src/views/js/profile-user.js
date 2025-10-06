import { requireAuth, getCurrentUser, logout } from './auth.js';

class ProfileUser {
    constructor() {
        this.currentUser = null;
        this.followers = [];
        this.following = [];
        this.datasets = [];
        this.init();
    }

    async init() {
        // Verificar autenticación
        if (!requireAuth()) return;
        
        this.currentUser = getCurrentUser();
        
        // Configurar elementos
        this.setupEventListeners();
        
        // Cargar datos del usuario
        await this.loadUserProfile(this.currentUser._id);
        
        // Cargar datos de las pestañas
        await this.loadFollowersData();
        await this.loadDatasetsData();
    }

    setupEventListeners() {
        // Botones de navegación
        const backBtn = document.getElementById('back-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const editBtn = document.getElementById('edit-btn');
        
        backBtn.addEventListener('click', () => window.history.back());
        logoutBtn.addEventListener('click', logout);
        editBtn.addEventListener('click', () => {
            alert('Funcionalidad de edición en desarrollo');
        });

        // Pestañas
        this.setupTabs();
    }

    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.closest('.tab-btn').getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Actualizar botones activos
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Actualizar contenido activo
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Recargar datos si es necesario
        if (tabName === 'followers') {
            this.loadFollowersData();
        } else if (tabName === 'datasets') {
            this.loadDatasetsData();
        }
    }

    // Función para cargar el perfil del usuario
    async loadUserProfile(userId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3000/api/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error('Error al cargar el perfil');
            
            const result = await response.json();
            
            if (result.success && result.user) {
                this.displayUserData(result.user);
            } else {
                throw new Error('Formato de respuesta inválido');
            }
            
        } catch (error) {
            console.error('Error cargando perfil:', error);
            this.showErrorMessage('Error al cargar los datos del perfil');
            // Mostrar datos del localStorage como fallback
            this.displayUserData(this.currentUser);
        }
    }

    // Función para cargar datos de seguidores
    async loadFollowersData() {
        try {
            const token = localStorage.getItem('token');
            const currentUserId = this.currentUser._id;
             
            
            // Mostrar loading
            this.showLoadingState('followers');
            
            // Cargar seguidores
            const followersResponse = await fetch(`http://localhost:3000/api/users/followers/${currentUserId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Cargar usuarios seguidos
            const followingResponse = await fetch(`http://localhost:3000/api/users/following/${currentUserId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
 

            let followers = [];
            let following = [];

            if (followersResponse.ok) {
                const result = await followersResponse.json();
                followers = result.followers || []; 
            } else {
                console.error('❌ Frontend - Error en respuesta de seguidores:', followersResponse.status);
            }

            if (followingResponse.ok) {
                const result = await followingResponse.json();
                following = result.following || []; 
            } else {
                console.error('❌ Frontend - Error en respuesta de seguidos:', followingResponse.status);
            }

            this.followers = followers;
            this.following = following;
            
            this.displayFollowersData(followers, following);
            
        } catch (error) {
            console.error('❌ Frontend - Error cargando datos de seguidores:', error);
            this.displayFollowersData([], []);
            this.showErrorMessage('Error al cargar los datos de seguidores');
        }
    }

    // Función para cargar datos de datasets
    async loadDatasetsData() {
        try {
            const token = localStorage.getItem('token');
            
            // Mostrar loading
            this.showLoadingState('datasets');
            
            const response = await fetch(`http://localhost:3000/api/datasets?creator=${this.currentUser._id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                const datasets = result.datasets || result || [];
                this.datasets = datasets;
                this.displayDatasetsData(datasets);
            } else {
                throw new Error('Error al cargar datasets');
            }
            
        } catch (error) {
            console.error('Error cargando datasets:', error);
            this.displayDatasetsData([]);
            this.showErrorMessage('Error al cargar los datasets');
        }
    }

    // Mostrar estado de carga
    showLoadingState(section) {
        const loadingHTML = '<div class="loading-indicator">Cargando...</div>';
        
        if (section === 'followers') {
            document.getElementById('followers-list').innerHTML = loadingHTML;
            document.getElementById('following-list').innerHTML = loadingHTML;
        } else if (section === 'datasets') {
            document.getElementById('datasets-list').innerHTML = loadingHTML;
        }
    }

    // Mostrar datos del usuario en la interfaz
    displayUserData(user) {
        // Nombre de usuario
        document.getElementById('username-value').textContent = user.username || 'No disponible';
        document.getElementById('profile-username').textContent = `@${user.username}`;
        
        // Nombre completo
        document.getElementById('fullname-value').textContent = user.nombreCompleto || 'No disponible';
        
        // Correo electrónico
        document.getElementById('email-value').textContent = user.correoElectronico || 'No disponible';
        
        // Fecha de nacimiento
        if (user.fechaNacimiento) {
            const birthdate = this.formatDate(user.fechaNacimiento);
            document.getElementById('birthdate-value').textContent = birthdate;
        } else {
            document.getElementById('birthdate-value').textContent = 'No disponible';
        }
        
        // Tipo de usuario
        document.getElementById('usertype-value').textContent = 
            user.tipoUsuario === 'admin' ? 'Administrador' : 'Usuario';
        
        // Imagen de perfil
        this.loadProfileImage(user.foto);
    }

    // Mostrar datos de seguidores
    displayFollowersData(followers, following) {
        const followersList = document.getElementById('followers-list');
        const followingList = document.getElementById('following-list');
        
        // Actualizar contadores
        document.getElementById('followers-count').textContent = followers.length;
        document.getElementById('following-count').textContent = following.length;

        // Renderizar seguidores
        if (followers.length === 0) {
            followersList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No tienes seguidores</p>
                </div>
            `;
        } else {
            followersList.innerHTML = followers.map(follower => `
                <div class="user-item" onclick="profileUser.viewUserProfile('${follower._id}')">
                    <div class="user-info-mini">
                        <div class="user-avatar-mini">
                            ${this.getUserAvatarHTML(follower)}
                        </div>
                        <div class="user-details-mini">
                            <h4>${follower.username || 'Usuario'}</h4>
                            <p>${follower.nombreCompleto || follower.correoElectronico || ''}</p>
                        </div>
                    </div>
                    <div class="user-actions-mini">
                        <button class="action-btn" onclick="event.stopPropagation(); profileUser.unfollowUser('${follower._id}')">
                            <i class="fas fa-user-minus"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        // Renderizar usuarios seguidos
        if (following.length === 0) {
            followingList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-plus"></i>
                    <p>No sigues a ningún usuario</p>
                </div>
            `;
        } else {
            followingList.innerHTML = following.map(followed => `
                <div class="user-item" onclick="profileUser.viewUserProfile('${followed._id}')">
                    <div class="user-info-mini">
                        <div class="user-avatar-mini">
                            ${this.getUserAvatarHTML(followed)}
                        </div>
                        <div class="user-details-mini">
                            <h4>${followed.username || 'Usuario'}</h4>
                            <p>${followed.nombreCompleto || followed.correoElectronico || ''}</p>
                        </div>
                    </div>
                    <div class="user-actions-mini">
                        <button class="action-btn" onclick="event.stopPropagation(); profileUser.unfollowUser('${followed._id}')">
                            <i class="fas fa-user-times"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    // Mostrar datos de datasets
    displayDatasetsData(datasets) {
        const datasetsList = document.getElementById('datasets-list');
        
        // Actualizar contador
        document.getElementById('datasets-count').textContent = datasets.length;

        if (datasets.length === 0) {
            datasetsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <p>No has creado ningún dataset</p>
                </div>
            `;
        } else {
            datasetsList.innerHTML = datasets.map(dataset => `
                <div class="dataset-item" onclick="profileUser.viewDataset('${dataset._id}')">
                    <div class="dataset-info">
                        <h4>${dataset.nombre || 'Sin nombre'}</h4>
                        <div class="dataset-meta">
                            <span>${this.formatDate(dataset.fecha_inclusion)}</span>
                            <span class="dataset-status status-${dataset.estado || 'pendiente'}">
                                ${dataset.estado || 'pendiente'}
                            </span>
                            <span>${dataset.descargas || 0} descargas</span>
                            <span>${this.formatSize(dataset.tamano || 0)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // Helper para obtener HTML del avatar
    getUserAvatarHTML(user) {
        if (user.foto && user.foto !== 'null' && user.foto !== 'undefined') {
            return `<img src="http://localhost:3000${user.foto}" alt="${user.username}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <i class="fas fa-user" style="display:none;"></i>`;
        } else {
            return '<i class="fas fa-user"></i>';
        }
    }

    // Función para cargar la imagen de perfil
    loadProfileImage(photoUrl) {
        const profileImage = document.getElementById('profileImage');
        const profilePlaceholder = document.getElementById('profilePlaceholder');
        
        if (photoUrl && photoUrl !== 'null' && photoUrl !== 'undefined') {
            profileImage.src = `http://localhost:3000${photoUrl}`;
            profileImage.style.display = 'block';
            profilePlaceholder.style.display = 'none';
        } else {
            profileImage.style.display = 'none';
            profilePlaceholder.style.display = 'flex';
        }
    }

    // Función para formatear fecha
    formatDate(dateString) {
        if (!dateString) return 'No disponible';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    // Función para formatear tamaño
    formatSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        
        const sizes = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        while (bytes >= 1024 && i < sizes.length - 1) {
            bytes /= 1024;
            i++;
        }
        return `${bytes.toFixed(1)} ${sizes[i]}`;
    }

    // Funciones de interacción (placeholder)
    viewUserProfile(userId) {
        console.log('Ver perfil de usuario:', userId);
        // Aquí puedes implementar la navegación al perfil de otro usuario
        alert(`Ver perfil del usuario: ${userId}`);
    }

    unfollowUser(userId) {
        console.log('Dejar de seguir usuario:', userId);
        // Aquí implementarías la funcionalidad para dejar de seguir
        if (confirm('¿Estás seguro de que quieres dejar de seguir a este usuario?')) {
            alert(`Dejando de seguir usuario: ${userId}`);
            // Recargar datos después de dejar de seguir
            this.loadFollowersData();
        }
    }

    viewDataset(datasetId) {
        console.log('Ver dataset:', datasetId);
        // Aquí puedes implementar la navegación al dataset
        alert(`Ver dataset: ${datasetId}`);
    }

    // Función para mostrar mensaje de error
    showErrorMessage(message) {
        console.error(message);
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f8d7da;
            color: #721c24;
            padding: 1rem;
            border-radius: 5px;
            border: 1px solid #f5c6cb;
            z-index: 1000;
        `;
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            document.body.removeChild(alertDiv);
        }, 5000);
    }
}

// Hacer la instancia global para los event handlers
let profileUser;

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    profileUser = new ProfileUser();
});