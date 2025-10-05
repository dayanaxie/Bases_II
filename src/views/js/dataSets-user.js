import { requireAuth, getCurrentUser, logout } from './auth.js';

document.addEventListener("DOMContentLoaded", async () => {
    // Verificar autenticación
    if (!requireAuth()) return;
    
    const logoutBtn = document.getElementById('logout-btn');
    
    const userData = getCurrentUser();
    
    if (userData.tipoUsuario === 'admin') {
        window.location.href = '/homeAdmin';
        return;
    }

    const datasetsContainer = document.getElementById("datasets");
    const searchInput = document.querySelector('.search-bar input');
    const searchBtn = document.querySelector('.fa-magnifying-glass').closest('button');
    const floatingBtn = document.querySelector('.floating-btn');
    
    let allDatasets = []; // Para almacenar todos los datasets

    // Cargar datasets desde la API
    async function loadDatasets() {
        try {
            datasetsContainer.innerHTML = '<div class="loading">Cargando datasets...</div>';
            
            const response = await fetch('http://localhost:3000/api/datasets');
            
            if (!response.ok) {
                throw new Error('Error al cargar los datasets');
            }
            
            const result = await response.json();
        
            allDatasets = result.datasets || result || [];

            renderDatasets(allDatasets);
            
        } catch (error) {
            console.error('Error:', error);
            showErrorMessage('Error al cargar los datasets. Intenta nuevamente.');
        }
    }

    // Render dinámico
    function renderDatasets(data) {
        const container = document.getElementById("datasets");
        container.innerHTML = ""; // limpiar antes de renderizar

        if (!data || !Array.isArray(data) || data.length === 0) {
            showNoDatasetsMessage();
            return;
        }

        // Si no hay datasets, mostrar mensaje
        if (!data || data.length === 0) {
            showNoDatasetsMessage();
            return;
        }

        data.forEach(dataset => {
            if (!dataset) return; // Saltar elementos nulos

            // Crear tarjeta
            const card = document.createElement("div");
            card.classList.add("dataset-card");

            // Info
            const info = document.createElement("div");
            info.classList.add("dataset-info");
            info.innerHTML = `
                <div class="dataset-header">
                    <h3 class="dataset-name">${dataset.nombre || 'Sin nombre'}</h3>
                    <h2 class="creator-name">
                        ${dataset.creadorId && dataset.creadorId.username 
                            ? dataset.creadorId.username 
                            : 'Desconocido'}
                    </h2>
                </div>
            `;

            // Botones
            const actions = document.createElement("div");
            actions.classList.add("dataset-actions");

            // Botón ver
            const viewBtn = document.createElement("button");
            viewBtn.classList.add("btn", "view");
            viewBtn.innerHTML = `<i class="fa-solid fa-eye"></i>`;
            viewBtn.addEventListener('click', () => viewDataset(dataset._id));

            actions.appendChild(viewBtn);

            // Juntar
            card.appendChild(info);
            card.appendChild(actions);

            container.appendChild(card);
        });
    }

    // Mensaje cuando no hay datasets
    function showNoDatasetsMessage() {
        datasetsContainer.innerHTML = `
            <div class="no-datasets">
                <div class="no-datasets-icon">
                    <i class="fa-solid fa-database"></i>
                </div>
                <h3>No hay datasets disponibles</h3>
            </div>
        `;
        
    }

    // Mensaje de error
    function showErrorMessage(message) {
        datasetsContainer.innerHTML = `
            <div class="error-message">
                <div class="error-icon">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                </div>
                <h3>Error</h3>
                <p>${message}</p>
                <button class="retry-btn">Reintentar</button>
            </div>
        `;
        
        // Agregar event listener al botón de reintentar
        const retryBtn = datasetsContainer.querySelector('.retry-btn');
        retryBtn.addEventListener('click', loadDatasets);
    }

    // Formatear tamaño
    function formatSize(bytes) {
        if (!bytes) return '0 B';
        
        const sizes = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        while (bytes >= 1024 && i < sizes.length - 1) {
            bytes /= 1024;
            i++;
        }
        return `${bytes.toFixed(1)} ${sizes[i]}`;
    }

    // Funciones para los botones de acción
    function viewDataset(datasetId) {
        
    }

    // Funcionalidad de búsqueda
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            renderDatasets(allDatasets);
            return;
        }
        
        const filteredDatasets = allDatasets.filter(dataset => {
            // Buscar en el nombre del dataset
            const nombreMatch = dataset.nombre?.toLowerCase().includes(searchTerm);
                        
            // Buscar en el username del creador
            const usernameMatch = dataset.creadorId?.username?.toLowerCase().includes(searchTerm);
            
            // Retornar true si coincide con alguno de los criterios
            return nombreMatch || usernameMatch;
        });
        
        renderDatasets(filteredDatasets);
    }

    // Botón flotante para crear nuevo dataset
    floatingBtn.addEventListener('click', function() {
        window.location.href = '/datasets/new';
    });

    logoutBtn.addEventListener('click', logout);


    // Inicialización con datos reales
    await loadDatasets();
});