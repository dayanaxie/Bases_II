import { requireAuth, logout } from './auth.js';

document.addEventListener("DOMContentLoaded", async () => {
    // Verificar autenticación
    if (!requireAuth()) return;

    // Configurar navegación y tabs
    setupNavigation();
    initTabs();
    
    // Obtener el ID del dataset de la URL
    const datasetId = getDatasetIdFromURL();
    
    if (!datasetId) {
        showError('ID de dataset no válido');
        return;
    }

    // Cargar la información real del dataset
    await loadDatasetData(datasetId);
});

function getDatasetIdFromURL() {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
}

// Configurar navegación
function setupNavigation() {
    // Botón de volver
    const backBtn = document.querySelector('.back-btn');
    backBtn.addEventListener('click', () => {
        window.location.href = '/datasetsUser';
    });

    // Botón de salir (logout)
    const exitBtn = document.querySelector('.exit-btn');
    exitBtn.addEventListener('click', logout);
}

// Función principal para cargar datos del dataset desde la API
async function loadDatasetData(datasetId) {
    try { 
        const response = await fetch(`/api/datasets/${datasetId}`);
        
        if (!response.ok) {
            throw new Error('Dataset no encontrado');
        }

        const datasetData = await response.json();
        
        renderDatasetInfo(datasetData);
        renderComments(datasetData.comments || []);
        renderVotes(datasetData.votes || []);
        
    } catch (error) {
        console.error("Error cargando datos del dataset:", error);
        showError('Error al cargar el dataset');
        // Usar datos mock como fallback
        loadMockData();
    }
}

// Función para cargar datos mock como fallback
function loadMockData() {
    const datasetMock = {
        nombre: "Ejemplo Dataset",
        descripcion: "Breve descripción del dataset.",
        fechaCreacion: "2024-09-29",
        archivos: 5,
        estado: "Activo",
        tamaño: "120 MB",
        descargas: 34,
        creadorId: {
            username: "Usuario Ejemplo"
        },
        comments: [
            {
                id: 1,
                userName: "Nombre de usuario",
                date: "29/09/2024",
                text: "Texto de ejemplo: esto es un comentario aquí puedes ver el comentario etc..."
            }
        ],
        votes: [
            { id: 1, userName: "Nombre de usuario", vote: "Me gusta" }
        ]
    };
    
    renderDatasetInfo(datasetMock);
    renderComments(datasetMock.comments);
    renderVotes(datasetMock.votes);
}

function renderDatasetInfo(dataset) {
    const infoPanel = document.getElementById("info");
    const detailsContainer = infoPanel.querySelector(".details");
    
    // Actualizar el título de la página
    document.querySelector('h1').textContent = dataset.nombre || 'DataSet';
    console.log("fecha:", dataset.fecha_inclusion);
    
    detailsContainer.innerHTML = `
        <p><strong>Nombre del DataSet:</strong> ${dataset.nombre || 'Sin nombre'}</p>
        <p><strong>Descripción:</strong> ${dataset.descripcion || 'Sin descripción'}</p>
        <p><strong>Fecha de inclusión:</strong> ${dataset.fecha_inclusion ? new Date(dataset.fecha_inclusion).toLocaleDateString() : '0'}</p>
        <p><strong>Tamaño del archivo:</strong> ${dataset.tamano ? dataset.tamano + ' MB' : '0 MB'}</p>        <p><strong>Cantidad de descargas:</strong> ${dataset.descargas || 0}</p>
        <p><strong>Creado por:</strong> ${dataset.creadorId?.username || 'Desconocido'}</p>
        ${dataset.estado ? `<p><strong>Estado:</strong> ${dataset.estado}</p>` : ''}
        ${dataset.archivos ? `<p><strong>Archivos:</strong> ${typeof dataset.archivos === 'number' ? dataset.archivos : dataset.archivos.length}</p>` : ''}
    `;

    // Configurar medios (imagen y video) - se mantienen igual
    loadMedia(dataset);
    setupDownloadButton(dataset);

}

// Función para cargar medios (imagen y video)
function loadMedia(dataset) {
    if (dataset.foto) {
        const imagePlaceholder = document.querySelector('.placeholder.image');
        imagePlaceholder.innerHTML = `<img src="${dataset.foto}" alt="Imagen del dataset" style="width: 100%; height: 100%; object-fit: cover;">`;
    }
    
    if (dataset.video_guia) {
        const videoPlaceholder = document.querySelector('.placeholder.video');
        videoPlaceholder.innerHTML = `
            <video controls style="width: 100%; height: 100%;">
                <source src="${dataset.video_guia}" type="video/mp4">
                Tu navegador no soporta el elemento video.
            </video>
        `;
    }
}

function setupDownloadButton(dataset) {
    const downloadBtn = document.querySelector('.edit-btn');
    
    downloadBtn.replaceWith(downloadBtn.cloneNode(true));
    const newDownloadBtn = document.querySelector('.edit-btn');
    
    newDownloadBtn.addEventListener('click', () => {
        downloadDataset(dataset);
    });
}


async function downloadDataset(dataset) {
    if (dataset.archivos && dataset.archivos.length > 0) {
        try {
            alert(`Iniciando descarga de ${dataset.archivos.length} archivos...`);
            
            const response = await fetch(`/api/datasets/${dataset._id}/download`, {
                method: 'POST', // o 'PATCH'
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Error al actualizar el contador de descargas');
            }

            const result = await response.json();
            console.log('Contador actualizado:', result);

            const nombreDataset = dataset.nombre 
                ? dataset.nombre.replace(/[^a-zA-Z0-9]/g, '_')
                : 'dataset';
            
            dataset.archivos.forEach((archivoRuta, index) => {
                setTimeout(() => {
                    const link = document.createElement('a');
                    link.href = archivoRuta;
                    
                    const nombreOriginal = archivoRuta.split('/').pop();
                    const extension = nombreOriginal.split('.').pop();
                    
                    if (dataset.archivos.length === 1) {
                        link.download = `${nombreDataset}.${extension}`;
                    } else {
                        link.download = `${nombreDataset}_parte${index + 1}.${extension}`;
                    }
                    
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }, index * 100);
            });

        } catch (error) {
            console.error('Error:', error);
            alert('Descarga iniciada (error en el contador)');
        }
        
    } else {
        alert('No hay archivos disponibles para descargar');
    }
}
// Función para mostrar errores
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
    `;
    document.querySelector('.container').prepend(errorDiv);
}

// ========== FUNCIONES EXISTENTES (sin cambios) ==========

// Función para renderizar comentarios (sin cambios)
function renderComments(comments) {
  const commentsContainer = document.getElementById("comments");
  commentsContainer.innerHTML = "";

  const commentsSection = document.createElement("div");
  commentsSection.classList.add("comments-section");

  // Header con botón de agregar comentario (anclado)
  const commentsHeader = document.createElement("div");
  commentsHeader.classList.add("comments-header");
  commentsHeader.innerHTML = `
    <button class="add-comment-btn">
      <i class="fa-solid fa-plus"></i> Agregar Comentario
    </button>
  `;
  commentsSection.appendChild(commentsHeader);

  // Lista de comentarios
  const commentsList = document.createElement("div");
  commentsList.classList.add("comments-list");

  comments.forEach((comment, index) => {
    const commentCard = document.createElement("div");
    commentCard.classList.add("comment-card");
    commentCard.innerHTML = `
      <div class="comment-header">
        <span class="comment-user">${comment.userName}</span>
        <span class="comment-date">${comment.date}</span>
      </div>
      <p class="comment-text">${comment.text}</p>
      <div class="comment-actions">
        <button class="reply-btn" data-comment-id="${comment.id}">
          <i class="fa-solid fa-comment"></i> Respuestas
        </button>
      </div>
    `;

    commentsList.appendChild(commentCard);

    if (index < comments.length - 1) {
      const divider = document.createElement("div");
      divider.classList.add("comment-divider");
      commentsList.appendChild(divider);
    }
  });

  commentsSection.appendChild(commentsList);
  commentsContainer.appendChild(commentsSection);

  const addCommentBtn = commentsHeader.querySelector('.add-comment-btn');
  addCommentBtn.addEventListener("click", openCommentModal);
  
  attachReplyEventListeners();
}

// Función para renderizar votos (sin cambios)
function renderVotes(votes) {
  const votesPanel = document.getElementById("votes");
  votesPanel.innerHTML = "";

  const votesSection = document.createElement("div");
  votesSection.classList.add("votes-section");

  const votesHeader = document.createElement("div");
  votesHeader.classList.add("votes-header");
  votesHeader.innerHTML = `
    <button class="add-vote-btn">
      <i class="fa-solid fa-plus"></i> Agregar Voto
    </button>
  `;
  votesSection.appendChild(votesHeader);

  const votesList = document.createElement("div");
  votesList.classList.add("votes-list");

  votes.forEach((vote, index) => {
    const voteCard = document.createElement("div");
    voteCard.classList.add("vote-card");
    voteCard.innerHTML = `
      <div class="vote-header">
        <span class="vote-user">${vote.userName}</span>
        <span class="vote-type">${vote.vote}</span>
      </div>
    `;

    votesList.appendChild(voteCard);

    if (index < votes.length - 1) {
      const divider = document.createElement("div");
      divider.classList.add("vote-divider");
      votesList.appendChild(divider);
    }
  });

  votesSection.appendChild(votesList);
  votesPanel.appendChild(votesSection);

  const addVoteBtn = votesHeader.querySelector('.add-vote-btn');
  addVoteBtn.addEventListener("click", openVoteModal);
}

// Funcionalidad de tabs (sin cambios)
function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tabPanels.forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      const tabId = tab.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");
    });
  });
}

// Funciones de modals (sin cambios)
function attachReplyEventListeners() {
  const replyButtons = document.querySelectorAll('.reply-btn');
  replyButtons.forEach(button => {
    button.addEventListener('click', function() {
      const commentId = this.getAttribute('data-comment-id');
      openRepliesModal(commentId);
    });
  });
}

function openRepliesModal(commentId) { 
  alert(`Funcionalidad para mostrar respuestas del comentario ID: ${commentId}`); 
}

function openCommentModal() { 
  alert("Funcionalidad para agregar comentario - Conectar con base de datos"); 
}

function openVoteModal() { 
  alert("Funcionalidad para agregar voto - Conectar con base de datos");
}