// Datos de ejemplo (mock). Luego reemplazas esto con el resultado de tu query.
const datasetsMock = [
  { id: 1, title: "Conjunto de Datos 1", user: "Usuario A", status: "soft" },
  { id: 2, title: "Conjunto de Datos 2", user: "Usuario B", status: "negative" }, 
  { id: 3, title: "Conjunto de Datos 3", user: "Usuario C", status: "soft" }
];

// Render dinámico
function renderDatasets(data) {
  const container = document.getElementById("datasets");
  container.innerHTML = ""; // limpiar antes de renderizar

  data.forEach(dataset => {
    // Crear tarjeta
    const card = document.createElement("div");
    card.classList.add("dataset-card");

    // Info
    const info = document.createElement("div");
    info.classList.add("dataset-info");
    info.innerHTML = `
      <h2>${dataset.title}</h2>
      <p>${dataset.user}</p>
    `;

    // Botones
    const actions = document.createElement("div");
    actions.classList.add("dataset-actions");

    // Botón ver
    const viewBtn = document.createElement("button");
    viewBtn.classList.add("btn", "view");
    viewBtn.innerHTML = `<i class="fa-solid fa-eye"></i>`;
 
    actions.appendChild(viewBtn);

    // Juntar
    card.appendChild(info);
    card.appendChild(actions);

    container.appendChild(card);
  });
 
}

 

// Inicialización con datos de ejemplo
document.addEventListener("DOMContentLoaded", () => {
    renderDatasets(datasetsMock);
    
    // Ejemplo de cómo cargarías desde tu query
    // fetchDataFromDB().then(data => renderDatasets(data));
});

// <i class="fa-regular fa-circle"></i>
// <i class="fa-solid fa-ban"></i>