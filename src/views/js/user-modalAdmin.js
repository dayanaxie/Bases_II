
class UserModal {
    constructor() {
        this.modalOverlay = document.getElementById('modal-overlay');
        this.modalClose = document.getElementById('modal-close');
        this.userData = null;
        this.userDatasets = [];

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


        // Tabs
        this.setupTabs();
    }

    // Configurar sistema de pestañas
    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    // Cambiar entre pestañas
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
    }

    // Mostrar modal con datos del usuario
    async show(userData) {
        if (!this.modalOverlay) {
            console.error('Modal overlay no encontrado');
            return;
        }
        
        this.userData = userData;
        this.populateUserData(userData);
        
        // Cargar datasets del usuario
        await this.loadUserDatasets(userData._id);
        
        // Mostrar modal con animación
        setTimeout(() => {
            this.modalOverlay.classList.add('active');
        }, 10);
    }

    // Cargar datasets del usuario
    async loadUserDatasets(userId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3000/api/datasets?creator=${userId}`, {
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
            // Limpiar container
            avatarContainer.innerHTML = '';
            
            // Crear imagen
            const img = document.createElement('img');
            img.src = `http://localhost:3000${user.foto}`;
            img.alt = user.nombreCompleto || user.username;
            
            // Manejar error de carga
            img.onerror = () => {
                console.warn('Error cargando imagen del usuario:', user.foto);
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