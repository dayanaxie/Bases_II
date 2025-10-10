import { requireAuth, logout } from './auth.js';

function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

document.addEventListener("DOMContentLoaded", async () => {
    if (!requireAuth()) return;

    setupNavigation();
    initTabs();
    
    const datasetId = getDatasetIdFromURL();
    
    if (!datasetId) {
        showError('ID de dataset no válido');
        return;
    }

    await loadDatasetData(datasetId);
});

function getDatasetIdFromURL() {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
}

function setupNavigation() {
    const backBtn = document.querySelector('.back-btn');
    backBtn.addEventListener('click', () => {
        window.location.href = '/datasetsUser';
    });

    const exitBtn = document.querySelector('.exit-btn');
    exitBtn.addEventListener('click', logout);
}

async function loadDatasetData(datasetId) {
  try { 
    const response = await fetch(`/api/datasets/${datasetId}`);
    
    if (!response.ok) {
      throw new Error('Dataset no encontrado');
    }

    const datasetData = await response.json();
    
    renderDatasetInfo(datasetData);
    await renderComments(datasetId); 
    await renderVotes(datasetId); 
    
  } catch (error) {
    console.error("Error cargando datos del dataset:", error);
    showError('Error al cargar el dataset');
  }
}

function renderDatasetInfo(dataset) {
    const infoPanel = document.getElementById("info");
    const detailsContainer = infoPanel.querySelector(".details");
    
    document.querySelector('h1').textContent = dataset.nombre || 'DataSet';
    
    detailsContainer.innerHTML = `
        <p><strong>Nombre del DataSet:</strong> ${dataset.nombre || 'Sin nombre'}</p>
        <p><strong>Descripción:</strong> ${dataset.descripcion || 'Sin descripción'}</p>
        <p><strong>Fecha de inclusión:</strong> ${dataset.fecha_inclusion ? new Date(dataset.fecha_inclusion).toLocaleDateString() : '0'}</p>
        <p><strong>Tamaño del archivo:</strong> ${dataset.tamano ? dataset.tamano + ' MB' : '0 MB'}</p>
        <p><strong>Cantidad de descargas:</strong> ${dataset.descargas || 0}</p>
        <p><strong>Creado por:</strong> ${dataset.creadorId?.username || 'Desconocido'}</p>
        ${dataset.estado ? `<p><strong>Estado:</strong> <span class="estado-badge estado-${dataset.estado}">${dataset.estado}</span></p>` : ''}
        ${dataset.archivos ? `<p><strong>Archivos:</strong> ${typeof dataset.archivos === 'number' ? dataset.archivos : dataset.archivos.length}</p>` : ''}
    `;

    loadMedia(dataset);
    setupActionButtons(dataset); // Cambiamos esta función
}


// Función para desactivar el dataset
async function desactivarDataset(datasetId) {
    if (!confirm('¿Estás seguro de que quieres desactivar este dataset?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/datasets/${datasetId}/estado`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                estado: 'desactivado'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Dataset desactivado exitosamente');
            await loadDatasetData(datasetId);
        } else {
            alert('Error al desactivar el dataset: ' + result.error);
        }
    } catch (error) {
        console.error('Error desactivando dataset:', error);
        alert('Error al desactivar el dataset');
    }
}


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

function setupActionButtons(dataset) {
    const currentUser = getCurrentUser();
    const isOwner = currentUser && dataset.creadorId && currentUser._id === dataset.creadorId._id;
    
    const actionsContainer = document.querySelector('.container-btn-edit');
    
    // Limpiar contenedor de acciones
    actionsContainer.innerHTML = '';
    
    // Botón de descarga (siempre visible)
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'edit-btn';
    downloadBtn.innerHTML = '<i class="fas fa-download"></i> Descargar';
    downloadBtn.addEventListener('click', () => {
        downloadDataset(dataset);
    });
    actionsContainer.appendChild(downloadBtn);
    
    // Botón de desactivar (solo para el dueño y si no está ya desactivado)
    if (isOwner && dataset.estado !== 'desactivado') {
        const desactivarBtn = document.createElement('button');
        desactivarBtn.className = 'edit-btn';
        desactivarBtn.innerHTML = '<i class="fas fa-power-off"></i> Desactivar';
        desactivarBtn.addEventListener('click', () => {
            desactivarDataset(dataset._id);
        });
        actionsContainer.appendChild(desactivarBtn);
    }
}


async function downloadDataset(dataset) {
    if (dataset.archivos && dataset.archivos.length > 0) {
        try {
            alert(`Iniciando descarga de ${dataset.archivos.length} archivos...`);
            
            const response = await fetch(`/api/datasets/${dataset._id}/download`, {
                method: 'POST',
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

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
    `;
    document.querySelector('.container').prepend(errorDiv);
}

// ========== COMENTARIOS Y RESPUESTAS ==========

async function renderComments(datasetId) {
  const commentsContainer = document.getElementById("comments");
  commentsContainer.innerHTML = "";

  const commentsSection = document.createElement("div");
  commentsSection.classList.add("comments-section");

  const commentsHeader = document.createElement("div");
  commentsHeader.classList.add("comments-header");
  commentsHeader.innerHTML = `
    <button class="add-comment-btn">
      <i class="fa-solid fa-plus"></i> Agregar Comentario
    </button>
  `;
  commentsSection.appendChild(commentsHeader);

  const commentsList = document.createElement("div");
  commentsList.classList.add("comments-list");

  try {
    const response = await fetch(`/api/datasets/${datasetId}/comments-with-replies`);
    const result = await response.json();

    if (result.success && result.comments.length > 0) {
      result.comments.forEach((comment, index) => {
        const commentCard = createCommentCard(comment, datasetId);
        commentsList.appendChild(commentCard);

        if (index < result.comments.length - 1) {
          const divider = document.createElement("div");
          divider.classList.add("comment-divider");
          commentsList.appendChild(divider);
        }
      });
    } else {
      const noComments = document.createElement("div");
      noComments.classList.add("no-comments");
      noComments.innerHTML = `
        <p style="text-align: center; color: var(--variable-collection-text-1); padding: 20px;">
          No hay comentarios aún. Sé el primero en comentar.
        </p>
      `;
      commentsList.appendChild(noComments);
    }
  } catch (error) {
    console.error("Error cargando comentarios:", error);
    const errorMsg = document.createElement("div");
    errorMsg.innerHTML = `
      <p style="text-align: center; color: var(--variable-collection-negativo); padding: 20px;">
        Error al cargar los comentarios.
      </p>
    `;
    commentsList.appendChild(errorMsg);
  }

  commentsSection.appendChild(commentsList);
  commentsContainer.appendChild(commentsSection);

  const addCommentBtn = commentsHeader.querySelector('.add-comment-btn');
  addCommentBtn.addEventListener("click", () => {
    openCommentModal(datasetId);
  });
}

function createCommentCard(comment, datasetId) {
  const commentCard = document.createElement("div");
  commentCard.classList.add("comment-card");
  
  let formattedDate = "Fecha desconocida";
  try {
    const commentDate = new Date(comment.timestamp);
    if (!isNaN(commentDate.getTime())) {
      formattedDate = commentDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch (error) {
    console.error('Error formateando fecha:', error);
  }

  commentCard.innerHTML = `
    <div class="comment-header">
      <div class="comment-user-info">
        ${comment.userPhoto ? 
          `<img src="${comment.userPhoto}" alt="${comment.userName}" class="comment-user-photo">` : 
          `<div class="comment-user-placeholder">
            <i class="fa-solid fa-user"></i>
           </div>`
        }
        <span class="comment-user">${comment.userName}</span>
      </div>
      <span class="comment-date">${formattedDate}</span>
    </div>
    <p class="comment-text">${comment.content}</p>
    <div class="comment-actions">
      <button class="reply-btn" data-comment-id="${comment.commentId}">
        <i class="fa-solid fa-reply"></i> Responder
      </button>
    </div>
  `;

  if (comment.replies && comment.replies.length > 0) {
    const repliesSection = createRepliesSection(comment.replies, comment.commentId, datasetId);
    commentCard.appendChild(repliesSection);
  } else {
    const noRepliesSection = createNoRepliesSection();
    commentCard.appendChild(noRepliesSection);
  }

  const replyBtn = commentCard.querySelector('.reply-btn');
  replyBtn.addEventListener('click', function() {
    const commentId = this.getAttribute('data-comment-id');
    openReplyModal(commentId, datasetId, comment.userName);
  });

  return commentCard;
}

function createRepliesSection(replies, commentId, datasetId) {
  const repliesSection = document.createElement("div");
  repliesSection.classList.add("replies-section");
  
  const repliesHeader = document.createElement("div");
  repliesHeader.classList.add("replies-header");
  repliesHeader.innerHTML = `
    <span class="replies-count">
      <i class="fa-solid fa-comments"></i>
      ${replies.length} ${replies.length === 1 ? 'respuesta' : 'respuestas'}
    </span>
    <button class="replies-toggle">
      <i class="fa-solid fa-chevron-down"></i> Mostrar
    </button>
  `;
  repliesSection.appendChild(repliesHeader);

  const repliesList = document.createElement("div");
  repliesList.classList.add("replies-list");
  repliesList.classList.add("collapsed");

  replies.forEach((reply, index) => {
    const replyElement = createReplyElement(reply);
    repliesList.appendChild(replyElement);

    if (index < replies.length - 1) {
      const divider = document.createElement("div");
      divider.classList.add("reply-divider");
      repliesList.appendChild(divider);
    }
  });

  repliesSection.appendChild(repliesList);

  const toggleBtn = repliesHeader.querySelector('.replies-toggle');
  const repliesListElement = repliesSection.querySelector('.replies-list');
  const toggleIcon = toggleBtn.querySelector('i');

  toggleBtn.addEventListener('click', function() {
    const isCollapsed = repliesListElement.classList.contains('collapsed');
    
    if (isCollapsed) {
      repliesListElement.classList.remove('collapsed');
      toggleIcon.className = 'fa-solid fa-chevron-up';
      toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-up"></i> Ocultar';
    } else {
      repliesListElement.classList.add('collapsed');
      toggleIcon.className = 'fa-solid fa-chevron-down';
      toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i> Mostrar';
    }
  });

  return repliesSection;
}

function createNoRepliesSection() {
  const noRepliesSection = document.createElement("div");
  noRepliesSection.classList.add("replies-section");
  
  const noRepliesMessage = document.createElement("div");
  noRepliesMessage.classList.add("no-replies");
  noRepliesMessage.innerHTML = `
    <i class="fa-regular fa-comment"></i>
    <span>No hay respuestas aún. Sé el primero en responder.</span>
  `;
  
  noRepliesSection.appendChild(noRepliesMessage);
  return noRepliesSection;
}

function createReplyElement(reply) {
  const replyElement = document.createElement("div");
  replyElement.classList.add("reply-card");
  
  let formattedDate = "Fecha desconocida";
  try {
    const replyDate = new Date(reply.timestamp);
    if (!isNaN(replyDate.getTime())) {
      formattedDate = replyDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch (error) {
    console.error('Error formateando fecha:', error);
  }

  replyElement.innerHTML = `
    <div class="reply-header">
      <div class="reply-user-info">
        ${reply.userPhoto ? 
          `<img src="${reply.userPhoto}" alt="${reply.userName}" class="reply-user-photo">` : 
          `<div class="reply-user-placeholder">
            <i class="fa-solid fa-user"></i>
           </div>`
        }
        <span class="reply-user">${reply.userName}</span>
      </div>
      <span class="reply-date">${formattedDate}</span>
    </div>
    <p class="reply-text">${reply.content}</p>
  `;

  return replyElement;
}

// ========== VOTOS ==========

async function renderVotes(datasetId) {
  const votesPanel = document.getElementById("votes");
  votesPanel.innerHTML = "";

  const votesSection = document.createElement("div");
  votesSection.classList.add("votes-section");

  const votesHeader = document.createElement("div");
  votesHeader.classList.add("votes-header");
  
  const currentUser = getCurrentUser();
  let userCurrentVote = null;

  try {
    if (currentUser) {
      const response = await fetch(`/api/datasets/${datasetId}/my-vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser._id
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        userCurrentVote = result.vote;
      }
    }
  } catch (error) {
    console.error("Error obteniendo voto actual:", error);
  }

  let buttonText = "Agregar Voto";
  if (userCurrentVote) {
    buttonText = `Mi voto: ${userCurrentVote.voteType}`;
  }

  votesHeader.innerHTML = `
    <button class="add-vote-btn">
      <i class="fa-solid fa-plus"></i> ${buttonText}
    </button>
  `;
  votesSection.appendChild(votesHeader);

  const votesList = document.createElement("div");
  votesList.classList.add("votes-list");

  try {
    const response = await fetch(`/api/datasets/${datasetId}/votes`);
    const result = await response.json();

    if (result.success && result.votes.length > 0) {
      result.votes.forEach((vote, index) => {
        const voteCard = createVoteCard(vote);
        votesList.appendChild(voteCard);

        if (index < result.votes.length - 1) {
          const divider = document.createElement("div");
          divider.classList.add("vote-divider");
          votesList.appendChild(divider);
        }
      });
    } else {
      const noVotes = document.createElement("div");
      noVotes.classList.add("no-votes");
      noVotes.innerHTML = `
        <p style="text-align: center; color: var(--variable-collection-text-1); padding: 20px;">
          No hay votos aún. Sé el primero en votar.
        </p>
      `;
      votesList.appendChild(noVotes);
    }
  } catch (error) {
    console.error("Error cargando votos:", error);
    const errorMsg = document.createElement("div");
    errorMsg.innerHTML = `
      <p style="text-align: center; color: var(--variable-collection-negativo); padding: 20px;">
        Error al cargar los votos.
      </p>
    `;
    votesList.appendChild(errorMsg);
  }

  votesSection.appendChild(votesList);
  votesPanel.appendChild(votesSection);

  const addVoteBtn = votesHeader.querySelector('.add-vote-btn');
  addVoteBtn.addEventListener("click", () => {
    openVoteModal(datasetId, userCurrentVote);
  });
}

function createVoteCard(vote) {
  const voteCard = document.createElement("div");
  voteCard.classList.add("vote-card");
  
  let formattedDate = "Fecha desconocida";
  try {
    const voteDate = new Date(vote.timestamp);
    if (!isNaN(voteDate.getTime())) {
      formattedDate = voteDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch (error) {
    console.error('Error formateando fecha:', error);
  }

  let voteClass = "";
  if (vote.voteType === "Me encanta" || vote.voteType === "Me gusta") {
    voteClass = "vote-positive";
  } else if (vote.voteType === "No me gusta" || vote.voteType === "Me desagrada") {
    voteClass = "vote-negative";
  }

  voteCard.innerHTML = `
    <div class="vote-header">
      <div class="vote-user-info">
        ${vote.userPhoto ? 
          `<img src="${vote.userPhoto}" alt="${vote.userName}" class="vote-user-photo">` : 
          `<div class="vote-user-placeholder">
            <i class="fa-solid fa-user"></i>
           </div>`
        }
        <span class="vote-user">${vote.userName}</span>
      </div>
      <span class="vote-date">${formattedDate}</span>
    </div>
    <div class="vote-content">
      <span class="vote-type ${voteClass}">${vote.voteType}</span>
    </div>
  `;

  return voteCard;
}

// ========== TABS Y MODALS ==========

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

// Las funciones de modals (openReplyModal, openCommentModal, openVoteModal) 
// se mantienen igual que en tu código original
// ... [aquí van todas las funciones de modals sin cambios]


// Función para abrir modal de respuesta
function openReplyModal(commentId, datasetId, commentAuthor) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert("Debes iniciar sesión para responder");
    return;
  }

  // Crear modal
  const modal = document.createElement("div");
  modal.classList.add("modal");
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  modal.innerHTML = `
    <div class="modal-content" style="
      background: var(--variable-collection-objeto-0);
      padding: 24px;
      border-radius: 10px;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    ">
      <div class="modal-header" style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--variable-collection-contraste);
      ">
        <h3 style="margin: 0; color: var(--variable-collection-contraste);">Responder a ${commentAuthor}</h3>
        <button class="close-modal" style="
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: var(--variable-collection-contraste);
        ">×</button>
      </div>
      
      <div class="modal-body">
        <textarea id="reply-text" placeholder="Escribe tu respuesta aquí..." style="
          width: 95%;
          height: 120px;
          padding: 12px;
          border: 1px solid var(--variable-collection-contraste);
          border-radius: 8px;
          background: var(--variable-collection-objeto-1);
          color: var(--variable-collection-text-1);
          resize: vertical;
          font-family: Arial, sans-serif;
        "></textarea>
      </div>
      
      <div class="modal-footer" style="
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 20px;
      "> 
        <button class="submit-reply-btn" style="
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          background: var(--variable-collection-contraste);
          color: var(--variable-collection-text-2);
          cursor: pointer;
          font-weight: bold;
        ">Publicar Respuesta</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Configurar eventos del modal
  const closeBtn = modal.querySelector(".close-modal");
  const submitBtn = modal.querySelector(".submit-reply-btn");
  const textarea = modal.querySelector("#reply-text");

  const closeModal = () => document.body.removeChild(modal);

  closeBtn.addEventListener("click", closeModal);

  submitBtn.addEventListener("click", async () => {
    const content = textarea.value.trim();

    if (!content) {
      alert("Por favor escribe una respuesta");
      return;
    }

    try {
      const response = await fetch(
        `/api/datasets/comments/${commentId}/replies`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: currentUser._id,
            content: content,
            datasetId: datasetId,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        closeModal();
        // Recargar comentarios
        await renderComments(datasetId);
      } else {
        alert("Error al publicar la respuesta: " + result.error);
      }
    } catch (error) {
      console.error("Error publicando respuesta:", error);
      alert("Error al publicar la respuesta");
    }
  });

  // Cerrar modal al hacer clic fuera
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

// Función para abrir modal de comentario
function openCommentModal(datasetId) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert("Debes iniciar sesión para comentar");
    return;
  }

  // Crear modal
  const modal = document.createElement("div");
  modal.classList.add("modal");
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  modal.innerHTML = `
    <div class="modal-content" style="
      background: var(--variable-collection-objeto-0);
      padding: 24px;
      border-radius: 10px;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    ">
      <div class="modal-header" style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--variable-collection-contraste);
      ">
        <h3 style="margin: 0; color: var(--variable-collection-contraste);">Agregar Comentario</h3>
        <button class="close-modal" style="
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: var(--variable-collection-contraste);
        ">×</button>
      </div>
      
      <div class="modal-body">
        <textarea id="comment-text" placeholder="Escribe tu comentario aquí..." style="
          width: 95%;
          height: 120px;
          padding: 12px;
          border: 1px solid var(--variable-collection-contraste);
          border-radius: 8px;
          background: var(--variable-collection-objeto-1);
          color: var(--variable-collection-text-1);
          resize: vertical;
          font-family: Arial, sans-serif;
        "></textarea>
      </div>
      
      <div class="modal-footer" style="
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-top: 20px;
      "> 
        <button class="submit-comment-btn">Publicar Comentario</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Configurar eventos del modal
  const closeBtn = modal.querySelector(".close-modal");
  // const cancelBtn = modal.querySelector('.cancel-btn');
  const submitBtn = modal.querySelector(".submit-comment-btn");
  const textarea = modal.querySelector("#comment-text");

  const closeModal = () => document.body.removeChild(modal);

  closeBtn.addEventListener("click", closeModal);
  // cancelBtn.addEventListener('click', closeModal);

  submitBtn.addEventListener("click", async () => {
    const content = textarea.value.trim();

    if (!content) {
      alert("Por favor escribe un comentario");
      return;
    }

    try {
      const response = await fetch(`/api/datasets/${datasetId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser._id,
          content: content,
        }),
      });

      const result = await response.json();

      if (result.success) {
        closeModal();
        // Recargar comentarios
        await renderComments(datasetId);
      } else {
        alert("Error al publicar el comentario: " + result.error);
      }
    } catch (error) {
      console.error("Error publicando comentario:", error);
      alert("Error al publicar el comentario");
    }
  });

  // Cerrar modal al hacer clic fuera
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

// Función para abrir modal de voto
function openVoteModal(datasetId, currentVote = null) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert("Debes iniciar sesión para votar");
    return;
  }

  // Crear modal
  const modal = document.createElement("div");
  modal.classList.add("modal");
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  const voteOptions = ["Me encanta", "Me gusta", "No me gusta", "Me desagrada"];

  let optionsHTML = voteOptions
    .map((option) => {
      const isSelected = currentVote && currentVote.voteType === option;
      return `
      <option value="${option}" ${
        isSelected ? "selected" : ""
      }>${option}</option>
    `;
    })
    .join("");

  modal.innerHTML = `
    <div class="modal-content" style="
      background: var(--variable-collection-objeto-0);
      padding: 24px;
      border-radius: 10px;
      width: 90%;
      max-width: 400px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    ">
      <div class="modal-header" style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--variable-collection-contraste);
      ">
        <h3 style="margin: 0; color: var(--variable-collection-contraste);">
          ${currentVote ? "Actualizar Voto" : "Agregar Voto"}
        </h3>
        <button class="close-modal" style="
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: var(--variable-collection-contraste);
        ">×</button>
      </div>
      
      <div class="modal-body">
        <label style="
          display: block;
          margin-bottom: 8px;
          color: var(--variable-collection-contraste);
          font-weight: bold;
        ">Selecciona tu voto:</label>
        <select id="vote-type" style="
          width: 100%;
          padding: 12px;
          border: 1px solid var(--variable-collection-contraste);
          border-radius: 8px;
          background: var(--variable-collection-objeto-1);
          color: var(--variable-collection-text-1);
          font-family: Arial, sans-serif;
          font-size: 14px;
        ">
          <option value="">Selecciona una opción...</option>
          ${optionsHTML}
        </select>
        
        ${
          currentVote
            ? `
          <div style="margin-top: 16px; text-align: center;">
            <button class="remove-vote-btn" style="
              padding: 8px 16px;
              border: 1px solid var(--variable-collection-negativo);
              border-radius: 6px;
              background: transparent;
              color: var(--variable-collection-negativo);
              cursor: pointer;
              font-size: 14px;
            ">Eliminar mi voto</button>
          </div>
        `
            : ""
        }
      </div>
      
      <div class="modal-footer" style="
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-top: 20px;
      "> 
        <button class="submit-vote-btn">${currentVote ? "Actualizar Voto" : "Guardar Voto"}</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Configurar eventos del modal
  const closeBtn = modal.querySelector(".close-modal");
  const submitBtn = modal.querySelector(".submit-vote-btn");
  const voteSelect = modal.querySelector("#vote-type");

  let removeVoteBtn = null;
  if (currentVote) {
    removeVoteBtn = modal.querySelector(".remove-vote-btn");
  }

  const closeModal = () => document.body.removeChild(modal);

  closeBtn.addEventListener("click", closeModal);

  if (removeVoteBtn) {
    removeVoteBtn.addEventListener("click", async () => {
      try {
        const response = await fetch(`/api/datasets/${datasetId}/votes`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: currentUser._id,
          }),
        });

        const result = await response.json();

        if (result.success) {
          closeModal();
          await renderVotes(datasetId);
        } else {
          alert("Error al eliminar el voto: " + result.error);
        }
      } catch (error) {
        console.error("Error eliminando voto:", error);
        alert("Error al eliminar el voto");
      }
    });
  }

  submitBtn.addEventListener("click", async () => {
    const voteType = voteSelect.value;

    if (!voteType) {
      alert("Por favor selecciona un tipo de voto");
      return;
    }

    try {
      const response = await fetch(`/api/datasets/${datasetId}/votes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser._id,
          voteType: voteType,
        }),
      });

      const result = await response.json();

      if (result.success) {
        closeModal();
        // Recargar votos
        await renderVotes(datasetId);
      } else {
        alert("Error al registrar el voto: " + result.error);
      }
    } catch (error) {
      console.error("Error registrando voto:", error);
      alert("Error al registrar el voto");
    }
  });

  // Cerrar modal al hacer clic fuera
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}
