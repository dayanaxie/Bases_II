import { requireAuth, getCurrentUser, logout } from './auth.js';

class ProfileUser {
    constructor() {
        this.currentUser = null;
        this.followers = [];
        this.following = [];
        this.datasets = [];
        this.isEditing = false;
        this.selectedFile = null;
        this.init();
        
        window.viewDataset = (datasetId) => this.viewDataset(datasetId);

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
            if (this.isEditing) {
                this.saveChanges();
            } else {
                this.toggleEditMode();
            }
        });

        // Pestañas
        this.setupTabs();
        
        // Configurar el input de imagen de perfil
        this.setupImageUpload();
    }

    setupImageUpload() {
        const profileImageContainer = document.querySelector('.profile-image-container');
        const avatarInput = document.createElement('input');
        avatarInput.type = 'file';
        avatarInput.accept = 'image/*';
        avatarInput.style.display = 'none';
        avatarInput.id = 'avatar-input';
        document.body.appendChild(avatarInput);

        // Hacer la imagen de perfil clickeable en modo edición
        profileImageContainer.addEventListener('click', () => {
            if (this.isEditing) {
                avatarInput.click();
            }
        });

        avatarInput.addEventListener('change', (event) => {
            if (this.isEditing) {
                this.handleImageUpload(event);
            }
        });
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

    toggleEditMode() {
        this.isEditing = !this.isEditing;
        
        if (this.isEditing) {
            this.enterEditMode();
        } else {
            this.exitEditMode();
        }
    }

    enterEditMode() {
        // Cambiar texto del botón
        document.getElementById('edit-btn').textContent = 'Guardar Cambios';
        
        // Hacer campos editables
        this.makeFieldsEditable();
        
        // Agregar indicador visual de edición
        document.querySelector('.profile-image-container').classList.add('editable');
        
        console.log('Modo edición activado');
    }

    exitEditMode() {
        // Cambiar texto del botón
        document.getElementById('edit-btn').textContent = 'Editar Perfil';
        
        // Quitar indicador visual de edición
        document.querySelector('.profile-image-container').classList.remove('editable');
        
        console.log('Modo edición desactivado');
    }

    makeFieldsEditable() {
        const editableFields = ['username', 'fullname', 'email', 'birthdate'];
        
        editableFields.forEach(field => {
            const element = document.getElementById(`${field}-value`);
            const currentValue = element.textContent;
            
            if (field === 'birthdate') {
                // Para fecha, crear input type date
                const input = document.createElement('input');
                input.type = 'date';
                input.value = this.formatDateForInput(currentValue);
                input.className = 'edit-input';
                element.innerHTML = '';
                element.appendChild(input);
            } else if (field === 'email') {
                // Para email, crear input type email
                const input = document.createElement('input');
                input.type = 'email';
                input.value = currentValue;
                input.className = 'edit-input';
                element.innerHTML = '';
                element.appendChild(input);
            } else {
                // Para otros campos, input type text
                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentValue;
                input.className = 'edit-input';
                element.innerHTML = '';
                element.appendChild(input);
            }
        });
    }

    async saveChanges() {
        try {
            // Recopilar datos del formulario
            const formData = new FormData();
            
            // Agregar campos editables
            const username = document.querySelector('#username-value input')?.value;
            const fullname = document.querySelector('#fullname-value input')?.value;
            const email = document.querySelector('#email-value input')?.value;
            const birthdate = document.querySelector('#birthdate-value input')?.value;

            if (username) formData.append('username', username);
            if (fullname) formData.append('nombreCompleto', fullname);
            if (email) formData.append('correoElectronico', email);
            if (birthdate) formData.append('fechaNacimiento', birthdate);
            console.log("Datos a enviar:", { username, fullname, email, birthdate });

            if (this.selectedFile) {
                console.log("Archivo de imagen seleccionado:", this.selectedFile.name);
                formData.append('foto', this.selectedFile);
            }



            const token = localStorage.getItem('token');
            
            const response = await fetch(`http://localhost:3000/api/users/${this.currentUser._id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Error al actualizar el perfil');
            }

            const result = await response.json();
            
            if (result.success) {
                // Actualizar usuario en localStorage
                if (result.user) {
                    localStorage.setItem('user', JSON.stringify(result.user));
                    this.currentUser = result.user;
                }
                
                // Recargar perfil
                await this.loadUserProfile(this.currentUser._id);
                
                // Salir del modo edición
                this.isEditing = false;
                this.exitEditMode();
                
                this.showSuccessMessage('Perfil actualizado correctamente');
            } else {
                throw new Error(result.message || 'Error al actualizar el perfil');
            }

        } catch (error) {
            console.error('Error guardando cambios:', error);
            this.showErrorMessage('Error al guardar los cambios: ' + error.message);
        }
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar que sea una imagen
        if (!file.type.startsWith('image/')) {
            this.showErrorMessage('Por favor selecciona un archivo de imagen válido');
            return;
        }

        // Validar tamaño (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showErrorMessage('La imagen debe ser menor a 5MB');
            return;
        }

        this.selectedFile = file;

        // Mostrar vista previa inmediata
        this.showImagePreview(file);

        // Notificar que hay cambios pendientes
        this.showInfoMessage('Imagen seleccionada. Guarda los cambios para aplicar.');

        console.log('Archivo almacenado temporalmente:', this.selectedFile.name);


        
    }

    showImagePreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const profileImage = document.getElementById('profileImage');
            const profilePlaceholder = document.getElementById('profilePlaceholder');
            
            profileImage.src = e.target.result;
            profileImage.style.display = 'block';
            profilePlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    formatDateForInput(dateString) {
        if (!dateString || dateString === 'No disponible') return '';
        
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch (error) {
            return '';
        }
    }

    switchTab(tabName) {
        // Si estamos en modo edición, guardar cambios antes de cambiar de pestaña
        if (this.isEditing) {
            if (confirm('Tienes cambios sin guardar. ¿Quieres guardarlos antes de cambiar de pestaña?')) {
                this.saveChanges();
            } else {
                this.isEditing = false;
                this.exitEditMode();
                // Recargar datos originales
                this.loadUserProfile(this.currentUser._id);
            }
        }

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
                <div class="dataset-item" onclick="viewDataset('${dataset._id}')">
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
        window.location.href = `/datasetsUser/${datasetId}`;
    }

    // Función para mostrar mensaje de éxito
    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    // Función para mostrar mensaje de información
    showInfoMessage(message) {
        this.showMessage(message, 'info');
    }

    // Función para mostrar mensaje de error
    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type = 'info') {
        console.log(message);
        const alertDiv = document.createElement('div');
        
        const styles = {
            success: {
                background: '#d4edda',
                color: '#155724',
                border: '1px solid #c3e6cb'
            },
            error: {
                background: '#f8d7da',
                color: '#721c24',
                border: '1px solid #f5c6cb'
            },
            info: {
                background: '#d1ecf1',
                color: '#0c5460',
                border: '1px solid #bee5eb'
            }
        };

        const style = styles[type] || styles.info;
        
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem;
            border-radius: 5px;
            z-index: 1000;
            font-weight: bold;
            background: ${style.background};
            color: ${style.color};
            border: ${style.border};
        `;
        
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (document.body.contains(alertDiv)) {
                document.body.removeChild(alertDiv);
            }
        }, 5000);
    }
}

// Hacer la instancia global para los event handlers
let profileUser;

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    profileUser = new ProfileUser();
});