// Datos de ejemplo (mock). Luego reemplazas esto con el resultado de tu query.
const usersMock = [
  { id: 1, userName: "Jose Perez"},
  { id: 2, userName: "Ana Smith"},
  { id: 3, userName: "Karen Rodriguez"}
];

// Render dinámico
function renderUsers(data) {
  const container = document.getElementById("users");
  container.innerHTML = ""; // limpiar antes de renderizar

  data.forEach(user => {
    // Crear tarjeta
    const card = document.createElement("div");
    card.classList.add("user-card");

    // Info
    const info = document.createElement("div");
    info.classList.add("user-info");
    info.innerHTML = `
      <h2>${user.userName}</h2> 
    `;

    // Botones
    const actions = document.createElement("div");
    actions.classList.add("user-actions");
 
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
    renderUsers(usersMock);
});