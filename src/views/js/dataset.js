// Datos de ejemplo (mock) - Reemplazar con query real
const datasetMock = {
  id: 1,
  name: "Ejemplo Dataset",
  description: "Breve descripción del dataset.",
  inclusionDate: "29/09/2025",
  files: 5,
  status: "Activo",
  fileSize: "120 MB",
  downloads: 34,
  comments: [
    {
      id: 1,
      userName: "Nombre de usuario",
      date: "29/09/2025",
      text: "Texto de ejemplo: esto es un comentario aquí puedes ver el comentario etc... ahora voy a repetir un montón una letra: aaaaa aaaaaa aaaa..."
    },
    {
      id: 2,
      userName: "Nombre de usuario",
      date: "28/09/2025",
      text: "Texto de ejemplo: esto es un comentario aquí puedes ver el comentario etc... ahora voy a repetir un montón una letra: aaaaa aaaaaa aaaa..."
    }
  ],
  votes: [
    { id: 1, userName: "Nombre de usuario", vote: "Me gusta" },
    { id: 2, userName: "Nombre de usuario", vote: "No me gusta" }, 
    { id: 3, userName: "Nombre de usuario", vote: "Me encanta" },
    { id: 4, userName: "Nombre de usuario", vote: "Me desagrada" }
  ]
};
 
// Función para renderizar comentarios
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
    // Tarjeta de comentario
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

    // Divisor (excepto después del último comentario)
    if (index < comments.length - 1) {
      const divider = document.createElement("div");
      divider.classList.add("comment-divider");
      commentsList.appendChild(divider);
    }
  });

  commentsSection.appendChild(commentsList);
  commentsContainer.appendChild(commentsSection);

  // Agregar event listeners
  const addCommentBtn = commentsHeader.querySelector('.add-comment-btn');
  addCommentBtn.addEventListener("click", openCommentModal);
  
  attachReplyEventListeners();
}

// Función para renderizar votos
function renderVotes(votes) {
  const votesPanel = document.getElementById("votes");
  votesPanel.innerHTML = "";

  const votesSection = document.createElement("div");
  votesSection.classList.add("votes-section");

  // Header con botón de agregar voto (anclado)
  const votesHeader = document.createElement("div");
  votesHeader.classList.add("votes-header");
  votesHeader.innerHTML = `
    <button class="add-vote-btn">
      <i class="fa-solid fa-plus"></i> Agregar Voto
    </button>
  `;
  votesSection.appendChild(votesHeader);

  // Lista de votos
  const votesList = document.createElement("div");
  votesList.classList.add("votes-list");

  votes.forEach((vote, index) => {
    // Tarjeta de voto
    const voteCard = document.createElement("div");
    voteCard.classList.add("vote-card");
    voteCard.innerHTML = `
      <div class="vote-header">
        <span class="vote-user">${vote.userName}</span>
        <span class="vote-type">${vote.vote}</span>
      </div>
    `;

    votesList.appendChild(voteCard);

    // Divisor (excepto después del último voto)
    if (index < votes.length - 1) {
      const divider = document.createElement("div");
      divider.classList.add("vote-divider");
      votesList.appendChild(divider);
    }
  });

  votesSection.appendChild(votesList);
  votesPanel.appendChild(votesSection);

  // Agregar event listener al botón de agregar voto
  const addVoteBtn = votesHeader.querySelector('.add-vote-btn');
  addVoteBtn.addEventListener("click", openVoteModal);
}

// Función para agregar event listeners a los botones de respuesta
function attachReplyEventListeners() {
  const replyButtons = document.querySelectorAll('.reply-btn');
  
  replyButtons.forEach(button => {
    button.addEventListener('click', function() {
      const commentId = this.getAttribute('data-comment-id');
      openRepliesModal(commentId);
    });
  });
}

// Función para el modal de respuestas (placeholder)
function openRepliesModal(commentId) { 
  alert(`Funcionalidad para mostrar respuestas del comentario ID: ${commentId}`); 
}

// Función para renderizar información del dataset
function renderDatasetInfo(dataset) {
  const infoPanel = document.getElementById("info");
  const detailsContainer = infoPanel.querySelector(".details");
  
  detailsContainer.innerHTML = `
    <p><strong>Nombre del DataSet:</strong> ${dataset.name}</p>
    <p><strong>Descripción:</strong> ${dataset.description}</p>
    <p><strong>Fecha de inclusión:</strong> ${dataset.inclusionDate}</p>
    <p><strong>Archivos:</strong> ${dataset.files}</p>
    <p><strong>Estado:</strong> ${dataset.status}</p>
    <p><strong>Tamaño del archivo:</strong> ${dataset.fileSize}</p>
    <p><strong>Cantidad de descargas:</strong> ${dataset.downloads}</p>
  `;
}

// Funcionalidad de tabs
function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // Remover clase active de todos los tabs y panels
      tabs.forEach(t => t.classList.remove("active"));
      tabPanels.forEach(p => p.classList.remove("active"));

      // Agregar clase active al tab clickeado
      tab.classList.add("active");
      
      // Mostrar el panel correspondiente
      const tabId = tab.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");
    });
  });
}

// Función para el modal de comentarios (placeholder)
function openCommentModal() { 
  alert("Funcionalidad para agregar comentario - Conectar con base de datos"); 
}

// Función para el modal de votos (placeholder)
function openVoteModal() { 
  alert("Funcionalidad para agregar voto - Conectar con base de datos");
}

// Función principal para cargar datos del dataset
async function loadDatasetData(datasetId) {
  try { 
    
    // Por ahora usamos mock data
    const datasetData = datasetMock;
    
    renderDatasetInfo(datasetData);
    renderComments(datasetData.comments);
    renderVotes(datasetData.votes);
    
  } catch (error) {
    console.error("Error cargando datos del dataset:", error);
  }
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  
  // Obtener el ID del dataset de la URL o parámetros
  const urlParams = new URLSearchParams(window.location.search);
  const datasetId = urlParams.get('id') || 1; // Default al dataset 1
  
  loadDatasetData(datasetId);
  
  // Botón de retroceso
  document.querySelector(".back-btn").addEventListener("click", () => {
    window.history.back();
  });
});