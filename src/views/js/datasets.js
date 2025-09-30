async function cargarDatasets() {
  const res = await fetch("/api/datasets");
  const datasets = await res.json();

  const lista = document.getElementById("datasetList");
  lista.innerHTML = "";

  datasets.forEach(ds => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${ds.nombre}</strong><br/>
      ${ds.descripcion}<br/>
      Estado: ${ds.estado}<br/>
      Tamaño: ${ds.tamano} MB<br/>
      Descargas: ${ds.descargas}<br/><hr/>
    `;
    lista.appendChild(li);
  });
}

cargarDatasets();
