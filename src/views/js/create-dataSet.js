import { requireAuth, getCurrentUser } from './auth.js';

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    if (!requireAuth()) return;

    const form = document.getElementById('createDatasetForm');
    const imageInput = document.getElementById('image-input');
    const videoInput = document.getElementById('video-input');
    const filesInput = document.getElementById('files');
    const uploadImageBtn = document.getElementById('upload-image-btn');
    const uploadVideoBtn = document.getElementById('upload-video-btn');
    const uploadFilesBtn = document.getElementById('upload-files-btn');
    const fileUploadText = document.getElementById('file-upload-text');
    const selectedFilesList = document.getElementById('selected-files-list');
    const imagePreview = document.getElementById('image-preview');
    const videoPreview = document.getElementById('video-preview');
    const messageDiv = document.getElementById('message');
    const submitBtn = document.querySelector('.submit-btn');

    // Función para mostrar mensajes
    function showMessage(message, type = 'success') {
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        messageDiv.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
        messageDiv.style.color = type === 'success' ? '#155724' : '#721c24';
        messageDiv.style.border = type === 'success' ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }

    // Manejar subida de imagen
    uploadImageBtn.addEventListener('click', () => imageInput.click());
    
    imageInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;">`;
            };
            
            reader.readAsDataURL(file);
        }
    });

    // Manejar subida de video
    uploadVideoBtn.addEventListener('click', () => videoInput.click());
    
    videoInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            videoPreview.innerHTML = `
                <div style="text-align: center; color: #666;">
                    <i class="fa-solid fa-file-video" style="font-size: 2rem;"></i>
                    <p style="margin: 5px 0; font-size: 0.8rem;">${file.name}</p>
                </div>
            `;
        }
    });

    // Manejar subida de archivos múltiples
    uploadFilesBtn.addEventListener('click', () => filesInput.click());
    
    filesInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        
        if (files.length > 0) {
            fileUploadText.textContent = `${files.length} archivo(s) seleccionado(s)`;
            
            // Mostrar lista de archivos
            selectedFilesList.innerHTML = files.map(file => 
                `<div class="file-item">
                    <i class="fa-solid fa-file"></i>
                    <span>${file.name}</span>
                    <small>(${(file.size / 1024).toFixed(1)} KB)</small>
                </div>`
            ).join('');
        } else {
            fileUploadText.textContent = 'Ningún archivo seleccionado';
            selectedFilesList.innerHTML = '';
        }
    });

    // Manejar envío del formulario
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);

        const userData = getCurrentUser();
        if (userData && userData._id) {
            formData.append('creadorId', userData._id);
            console.log('User ID:', userData._id);
        } else {
            showMessage('Error: Usuario no autenticado', 'error');
            return;
        }
        console.log('userdata:', userData);

        // Validaciones básicas
        const datasetName = document.getElementById('datasetName').value;
        const descripcion = document.getElementById('descripcion').value;
        
        if (!datasetName || !descripcion) {
            showMessage('Por favor completa todos los campos obligatorios', 'error');
            return;
        }

        // Cambiar estado del botón
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creando...';

        try {
            const response = await fetch('http://localhost:3000/api/datasets', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showMessage('✅ Dataset creado exitosamente!', 'success');
                form.reset();
                imagePreview.innerHTML = '<i class="fa-solid fa-image"></i>';
                videoPreview.innerHTML = '<i class="fa-solid fa-video"></i>';
                fileUploadText.textContent = 'Ningún archivo seleccionado';
                selectedFilesList.innerHTML = '';
                
                setTimeout(() => {
                    window.location.href = '/datasetsUser';
                }, 2000);
            } else {
                showMessage(result.error || result.message || 'Error al crear el dataset', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error de conexión. Inténtalo de nuevo.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Crear DataSet';
        }
    });

    // Botón de volver
    const backArrow = document.querySelector('.back-arrow');
    backArrow.addEventListener('click', function(e) {
        e.preventDefault();
        const userData = getCurrentUser();
        if (userData.tipoUsuario === 'admin') {
            window.location.href = '/datasetsAdmin';
        } else {
            window.location.href = '/datasetsUser';
        }
    });
});