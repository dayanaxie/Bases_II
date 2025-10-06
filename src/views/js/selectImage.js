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
        // Validar que sea una imagen
        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen válido');
            avatarInput.value = '';
            return;
        }

        // Validar tamaño (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen debe ser menor a 5MB');
            avatarInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            // Limpiar el contenido previo
            avatarPreview.innerHTML = '';
            
            // Crear elemento img
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            
            avatarPreview.appendChild(img);
        };
        reader.onerror = () => {
            console.error('Error al leer el archivo');
            alert('Error al cargar la imagen');
        };
        reader.readAsDataURL(file);
    }
});