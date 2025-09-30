document.getElementById("datasetForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;

  // Construir el objeto con los datos del formulario
  const data = {
    nombre: form.nombre.value.trim(),
    descripcion: form.descripcion.value.trim()
  };

  // Solo agregamos los campos opcionales si el usuario los llenó
  if (form.foto.value.trim()) data.foto = form.foto.value.trim();
  if (form.archivos.value.trim()) data.archivos = form.archivos.value.trim();
  if (form.video_guia.value.trim()) data.video_guia = form.video_guia.value.trim();
  if (form.tamano.value.trim()) data.tamano = parseInt(form.tamano.value.trim());

  try {
    const res = await fetch("/api/datasets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      alert("✅ DataSet creado correctamente");
      window.location.href = "/datasets"; // Redirige a la lista
    } else {
      const error = await res.json();
      alert("❌ Error: " + error.error);
    }
  } catch (err) {
    alert("❌ Error de conexión con el servidor: " + err.message);
  }
});
