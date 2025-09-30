// Selección de elementos
const avatarInput = document.getElementById('avatar-input');
const avatarPreview = document.getElementById('avatar-preview');
const uploadBtn = document.getElementById('upload-btn');

// Abrir el selector de archivos al hacer clic en el botón
uploadBtn.addEventListener('click', () => {
    avatarInput.click();
});

// Mostrar vista previa de la imagen seleccionada
avatarInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            avatarPreview.style.backgroundImage = `url(${e.target.result})`;
            avatarPreview.innerHTML = ''; // Eliminar el ícono
        };
        reader.readAsDataURL(file);
    }
});