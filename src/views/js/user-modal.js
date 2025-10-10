import { followUser, unfollowUser, isFollowing } from './neo4j-frontend.js';

class UserModal {
    constructor() {
        this.modalOverlay = document.getElementById('modal-overlay');
        this.modalClose = document.getElementById('modal-close');
        this.followBtn = document.getElementById('follow-btn');
        this.userData = null;
        this.userDatasets = [];
        this.currentUser = null;

        window.viewDataset = (datasetId) => this.viewDataset(datasetId);
        
        if (this.modalOverlay && this.modalClose) {
            this.initEventListeners();
        } else {
            console.warn('Elementos del modal no encontrados');
        }
    }

    initEventListeners() {
        // Cerrar modal con botón X
        this.modalClose.addEventListener('click', () => {
            this.close();
        });

        // Cerrar modal haciendo clic fuera
        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) {
                this.close();
            }
        });

        // Cerrar modal con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalOverlay.classList.contains('active')) {
                this.close();
            }
        });

        // Botón seguir
        if (this.followBtn) {
            this.followBtn.addEventListener('click', () => {
                this.handleFollow();
            });
        }

        // Tabs - CORREGIDO
        this.setupTabs();
    }

    // Configurar sistema de pestañas - CORREGIDO
    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    // Cambiar entre pestañas - CORREGIDO
    switchTab(tabName) {
        console.log('Cambiando a pestaña:', tabName); // Debug
        
        // Actualizar botones activos
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Actualizar contenido activo
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) {
            activeContent.classList.add('active');
        }
    }

    // Obtener usuario actual desde localStorage
    getCurrentUser() {
        try {
            const userData = localStorage.getItem('user');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error obteniendo usuario actual:', error);
            return null;
        }
    }

    // Mostrar modal con datos del usuario
    async show(userData) {
        if (!this.modalOverlay) {
            console.error('Modal overlay no encontrado');
            return;
        }
        
        this.userData = userData;
        this.currentUser = this.getCurrentUser();
        
        // Verificar estado de seguimiento
        await this.checkFollowStatus();
        
        this.populateUserData(userData);
        
        // Cargar datasets del usuario
        await this.loadUserDatasets(userData._id);
        
        // Mostrar modal con animación
        setTimeout(() => {
            this.modalOverlay.classList.add('active');
        }, 10);
    }

    // Verificar si el usuario actual sigue al usuario del modal
    async checkFollowStatus() {
        if (!this.currentUser || !this.userData) {
            this.updateFollowButton(false);
            return;
        }

        try {
            const following = await isFollowing(this.currentUser._id, this.userData._id);
            this.updateFollowButton(following);
        } catch (error) {
            console.error('Error verificando estado de seguimiento:', error);
            this.updateFollowButton(false);
        }
    }

    // Actualizar estado del botón seguir
    updateFollowButton(isFollowing) {
        if (!this.followBtn) return;

        if (isFollowing) {
            this.followBtn.innerHTML = '<i class="fa-solid fa-check"></i> Siguiendo';
            this.followBtn.classList.add('following');
        } else {
            this.followBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Seguir';
            this.followBtn.classList.remove('following');
        }
        
        this.followBtn.disabled = false;
    }

    // Manejar funcionalidad de seguir/dejar de seguir
    async handleFollow() {
        if (!this.userData || !this.currentUser || !this.followBtn) return;
        
        const followBtn = this.followBtn;
        const isCurrentlyFollowing = followBtn.classList.contains('following');
        
        // Cambiar estado del botón inmediatamente
        followBtn.disabled = true;
        
        if (isCurrentlyFollowing) {
            // Dejar de seguir
            followBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Dejando de seguir...';
        } else {
            // Seguir
            followBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Siguiendo...';
        }
        
        try {
            if (isCurrentlyFollowing) {
                // Dejar de seguir
                await unfollowUser(this.currentUser._id, this.userData._id);
                this.updateFollowButton(false);
                console.log(`Dejó de seguir al usuario: ${this.userData.username}`);
            } else {
                // Seguir
                await followUser(this.currentUser._id, this.userData._id);
                this.updateFollowButton(true);
                console.log(`Siguiendo al usuario: ${this.userData.username}`);
            }
        } catch (error) {
            console.error('Error en operación de seguir:', error);
            // Revertir al estado anterior en caso de error
            this.updateFollowButton(isCurrentlyFollowing);
            
            // Mostrar mensaje de error
            alert('Error al procesar la operación. Intenta nuevamente.');
        }
    }

    // Cargar datasets del usuario
    async loadUserDatasets(userId) {
        try {
            const token = localStorage.getItem('token');
            // const response = await fetch(`http://localhost:3000/api/datasets?creator=${userId}`, {
            const response = await fetch(`http://localhost:3000/api/datasets/creador/${userId}`, {

                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                this.userDatasets = result.datasets || result || [];
            } else {
                throw new Error('Error al cargar datasets');
            }
        } catch (error) {
            console.error('Error cargando datasets:', error);
            this.userDatasets = [];
        }
        
        this.renderDatasets();
    }

    // Renderizar lista de datasets
    renderDatasets() {
        const datasetsContainer = document.getElementById('datasets-list');
        if (!datasetsContainer) return;

        if (this.userDatasets.length === 0) {
            datasetsContainer.innerHTML = `
                <div class="no-datasets">
                    <i class="fa-solid fa-database"></i>
                    <p>No hay datasets publicados</p>
                </div>
            `;
            return;
        }
        console.log('dataset id:', this.userDatasets);

        datasetsContainer.innerHTML = this.userDatasets.map(dataset => `
            <div class="dataset-item" onclick="viewDataset('${dataset._id}')">
                <div class="dataset-name">${dataset.nombre || 'Sin nombre'}</div>
                <div class="dataset-meta">
                    <span>${this.formatDate(dataset.fecha_inclusion)}</span>
                    <span class="dataset-status status-${dataset.estado || 'pendiente'}">
                        ${dataset.estado || 'pendiente'}
                    </span>
                </div>
            </div>
        `).join('');
    }

    viewDataset(datasetId) {
        console.log('Navegando al dataset:', datasetId);
        // Redirigir a la página de visualización del dataset
        window.location.href = `/datasetsUser/${datasetId}`;
    }

    // Llenar modal con datos del usuario
    populateUserData(user) {
        // Nombre y username
        this.setElementText('user-name', user.nombreCompleto || user.username);
        this.setElementText('user-username', `@${user.username}`);
        
        // Email
        this.setElementText('user-email', user.correoElectronico);
        
        // Fecha de nacimiento y edad
        const birthdate = this.formatDate(user.fechaNacimiento);
        const age = this.calculateAge(user.fechaNacimiento);
        
        this.setElementText('user-birthdate', birthdate);
        this.setElementText('user-age', `${age} años`);
        
        // Avatar
        this.setUserAvatar(user);

        // Estadísticas (para la pestaña de info)
        this.setElementText('user-datasets-count', this.userDatasets.length);
    }

    // Ver dataset (placeholder)
    viewDataset(datasetId) {
        console.log('Ver dataset:', datasetId);
        // Aquí puedes implementar la navegación al dataset
        // window.location.href = `/dataset/${datasetId}`;
        
        // Por ahora, mostrar alerta
        const dataset = this.userDatasets.find(d => d._id === datasetId);
        if (dataset) {
            alert(`Dataset: ${dataset.nombre}\nEstado: ${dataset.estado}\nDescargas: ${dataset.descargas || 0}`);
        }
    }

    // Helper para establecer texto en elementos
    setElementText(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    }

    // Configurar avatar del usuario
    setUserAvatar(user) {
        const avatarContainer = document.getElementById('user-avatar');
        if (!avatarContainer) return;
        
        if (user.foto && user.foto !== 'null' && user.foto !== 'undefined') {
            avatarContainer.innerHTML = '';
            const img = document.createElement('img');
            img.src = `http://localhost:3000${user.foto}`;
            img.alt = user.nombreCompleto || user.username;
            img.onerror = () => {
                this.showAvatarPlaceholder(avatarContainer);
            };
            avatarContainer.appendChild(img);
        } else {
            this.showAvatarPlaceholder(avatarContainer);
        }
    }

    // Mostrar placeholder del avatar
    showAvatarPlaceholder(container) {
        container.innerHTML = '<i class="fa-solid fa-user" id="avatar-placeholder"></i>';
    }

    // Cerrar modal
    close() {
        if (!this.modalOverlay) return;
        
        this.modalOverlay.classList.remove('active');
        setTimeout(() => {
            this.userData = null;
            this.userDatasets = [];
            this.currentUser = null;
        }, 300);
    }

    // Utilidades
    formatDate(dateString) {
        if (!dateString) return 'No especificada';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    calculateAge(dateString) {
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
}

export default UserModal;