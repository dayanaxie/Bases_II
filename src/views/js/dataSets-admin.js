import { requireAuth, logout } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Verificar autenticación
  if (!requireAuth()) return;

  const logoutBtn = document.getElementById("logout-btn");
  const usersBtn = document.getElementById("users-btn");
  const datasetsContainer = document.getElementById("datasets");
  const searchInput = document.querySelector(".search-bar input");
  const searchBtn = document
    .querySelector(".fa-magnifying-glass")
    .closest("button");

  let allDatasets = []; // Para almacenar todos los datasets

  // Cargar datasets desde la API
  async function loadDatasets() {
    try {
      datasetsContainer.innerHTML =
        '<div class="loading">Cargando datasets...</div>';      
      const response = await fetch("http://localhost:3000/api/datasets");

      if (!response.ok) {
        throw new Error("Error al cargar los datasets");
      }

      const result = await response.json();

      allDatasets = result.datasets || result || [];

      renderDatasets(allDatasets);
    } catch (error) {
      console.error("Error:", error);
      showErrorMessage("Error al cargar los datasets. Intenta nuevamente.");
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

    data.forEach((dataset) => {
      if (!dataset) return; // Saltar elementos nulos

      // Crear tarjeta
      const card = document.createElement("div");
      card.classList.add("dataset-card");

      // Info
      const info = document.createElement("div");
      info.classList.add("dataset-info");
      info.innerHTML = `
                    <div class="dataset-header">
                        <h3 class="dataset-name">${
                          dataset.nombre || "Sin nombre"
                        }</h3>
                        <button class="creator-btn" data-user-id="${
                          dataset.creadorId?._id || ""
                        }">
                            ${
                              dataset.creadorId && dataset.creadorId.username
                                ? dataset.creadorId.username
                                : "Desconocido"
                            }
                        </button>
                    </div>
                    ${
                      dataset.descripcion
                        ? `
                        <div class="dataset-description">
                            <p>${dataset.descripcion}</p>
                        </div>
                    `
                        : ""
                    }
                `;

      // Botones
      const actions = document.createElement("div");
      actions.classList.add("dataset-actions");
      // Botón toggle
      const toggleBtn = document.createElement("button");
      toggleBtn.classList.add("btn", "toggle-btn");
      toggleBtn.setAttribute("data-dataset-id", dataset._id);

        // Determinar el estado inicial basado en dataset.estado
        if (dataset.estado === "aprobado") {
          toggleBtn.classList.add("soft");
          toggleBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
          toggleBtn.title = "Aprobado"; // Tooltip

        } else if (dataset.estado === "pendiente") {
          toggleBtn.classList.add("pending");
          toggleBtn.innerHTML = `<i class="fa-solid fa-clock"></i>`;
          toggleBtn.title = "Pendiente"; // Tooltip
        } 

      // Botón ver
      const viewBtn = document.createElement("button");
      viewBtn.classList.add("btn", "view");
      viewBtn.innerHTML = `<i class="fa-solid fa-eye"></i>`;
      viewBtn.addEventListener("click", () => viewDataset(dataset._id));

      actions.appendChild(toggleBtn);
      actions.appendChild(viewBtn);

      // Juntar
      card.appendChild(info);
      card.appendChild(actions);

      container.appendChild(card);
    });

    attachToggleEvents();
    addCreatorButtonListeners();
  }

  // Función para agregar event listeners a los botones de creador
  function addCreatorButtonListeners() {
    const creatorButtons = document.querySelectorAll(".creator-btn");
    creatorButtons.forEach((button) => {
      button.addEventListener("click", function () {
        const userId = this.getAttribute("data-user-id");
        if (userId) {
          viewUserProfile(userId);
        }
      });
    });
  }

function attachToggleEvents() {
  const toggleButtons = document.querySelectorAll(".toggle-btn");

  toggleButtons.forEach((button) => {
    button.addEventListener("click", function() {
      const datasetId = this.getAttribute("data-dataset-id");
      
      if (this.classList.contains("pending")) {
        // Cambiar de Pendiente → Aprobado
        this.classList.remove("pending");
        this.classList.add("soft");
        this.innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
        this.title = "Aprobado"; // Tooltip
        updateDatasetStatus(datasetId, "aprobado");
      } else if (this.classList.contains("soft")) {
        // Cambiar de Aprobado → Pendiente
        this.classList.remove("soft");
        this.classList.add("pending");
        this.innerHTML = `<i class="fa-solid fa-clock"></i>`;
        this.title = "Pendiente"; // Tooltip
        updateDatasetStatus(datasetId, "pendiente");
      }
    });
  });
}


// Función para actualizar el estado del dataset en el backend
async function updateDatasetStatus(datasetId, newStatus) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:3000/api/datasets/${datasetId}/estado`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        estado: newStatus
      })
    });

    if (!response.ok) {
      throw new Error('Error al actualizar el estado del dataset');
    }

    const result = await response.json();
    console.log('Estado actualizado:', result);
    
    // Actualizar el dataset en allDatasets
    const datasetIndex = allDatasets.findIndex(d => d._id === datasetId);
    if (datasetIndex !== -1) {
      allDatasets[datasetIndex].estado = newStatus;
    }
    
  } catch (error) {
    console.error('Error actualizando estado:', error);
    // Podrías mostrar un mensaje de error al usuario aquí
  }
}
  // Función para redirigir al perfil del usuario
  function viewUserProfile(userId) {
    // Aquí puedes redirigir a la página del perfil del usuario
    // Por ejemplo:
    //window.location.href = `/user/${userId}`;
    // O si quieres mostrar más información del usuario:
    // showUserInfo(userId);
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
    const retryBtn = datasetsContainer.querySelector(".retry-btn");
    retryBtn.addEventListener("click", loadDatasets);
  }

  // Funciones para los botones de acción
  function viewDataset(datasetId) {
    // llevar a la pantalla de ver dataset
    window.location.href = `/datasetsUser/${datasetId}`;
  }

  // Funcionalidad de búsqueda
  searchBtn.addEventListener("click", performSearch);
  searchInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      performSearch();
    }
  });

  function performSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();

    if (searchTerm === "") {
      renderDatasets(allDatasets);
      return;
    }

    const filteredDatasets = allDatasets.filter((dataset) => {
      // Buscar en el nombre del dataset
      const nombreMatch = dataset.nombre?.toLowerCase().includes(searchTerm);

      // Buscar en el username del creador
      const usernameMatch = dataset.creadorId?.username
        ?.toLowerCase()
        .includes(searchTerm);

      const descripcionMatch = dataset.descripcion
        ?.toLowerCase()
        .includes(searchTerm);

      // Retornar true si coincide con alguno de los criterios
      return nombreMatch || usernameMatch || descripcionMatch;
    });

    renderDatasets(filteredDatasets);
  }

  usersBtn.addEventListener('click', function() {
        window.location.href = '/usersAdmin';
    });

  logoutBtn.addEventListener("click", logout);

  // Inicialización con datos reales
  await loadDatasets();
});
