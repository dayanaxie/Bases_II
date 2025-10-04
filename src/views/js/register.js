document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const submitBtn = document.getElementById('submit-btn');
    const messageDiv = document.getElementById('message');

    function showMessage(message, type = 'success') {
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        messageDiv.className = type === 'success' ? 'message success' : 'message error';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }

    // para mostrar errores en los campos
    function showFieldError(fieldId, message) {
        const errorSpan = document.getElementById(fieldId + '-error');
        const input = document.getElementById(fieldId);
        
        if (errorSpan && input) {
            errorSpan.textContent = message;
            input.style.borderColor = 'red';
        }
    }

    //  limpiar errores
    function clearErrors() {
        const errorSpans = document.querySelectorAll('.error-message');
        const inputs = document.querySelectorAll('input');
        
        errorSpans.forEach(span => span.textContent = '');
        inputs.forEach(input => input.style.borderColor = '');
    }

    // validar el formulario
    function validateForm(formData) {
        let isValid = true;
        clearErrors();

        if (!formData.get('username') || formData.get('username').length < 3) {
            showFieldError('username', 'El username debe tener al menos 3 caracteres');
            isValid = false;
        }

        if (!formData.get('nombreCompleto')) {
            showFieldError('nombre', 'El nombre completo es obligatorio');
            isValid = false;
        }

        const email = formData.get('correoElectronico');
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!email || !emailRegex.test(email)) {
            showFieldError('email', 'Por favor ingresa un correo electrónico válido');
            isValid = false;
        }

        if (!formData.get('password') || formData.get('password').length < 6) {
            showFieldError('password', 'La contraseña debe tener al menos 6 caracteres');
            isValid = false;
        }

        if (!formData.get('fechaNacimiento')) {
            showFieldError('birthdate', 'La fecha de nacimiento es obligatoria');
            isValid = false;
        } 

        return isValid;
    }

    // Manejar el envío del formulario
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(registerForm);
        
        // Validar formulario
        if (!validateForm(formData)) {
            return;
        }

        // Cambiar estado del botón
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrando...';

        // Asegurarse de incluir el archivo en el FormData
        const fileInput = document.getElementById('avatar-input');
        if (fileInput.files.length > 0) {
          formData.set('foto', fileInput.files[0]); 
        }


        try {
            const response = await fetch('http://localhost:3000/api/users/register', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showMessage('¡Usuario registrado exitosamente! Redirigiendo...', 'success');
                
                setTimeout(() => {
                    window.location.href = '/homeUser';
                }, 2000);
            } else {
                // Mostrar errores del servidor
                if (result.errors) {
                    result.errors.forEach(error => {
                        showMessage(error, 'error');
                    });
                } else if (result.message) {
                    showMessage(result.message, 'error');
                } else {
                    showMessage('Error al registrar el usuario', 'error');
                }
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error de conexión. Inténtalo de nuevo.', 'error');
        } finally {
            // Restaurar botón
            submitBtn.disabled = false;
            submitBtn.textContent = 'Registrarme';
        }
    });

    // Validación en tiempo real
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            const formData = new FormData(registerForm);
            validateForm(formData);
        });
        
        input.addEventListener('input', function() {
            // Limpiar error cuando el usuario empiece a escribir
            const errorSpan = document.getElementById(this.id + '-error');
            if (errorSpan) {
                errorSpan.textContent = '';
                this.style.borderColor = '';
            }
        });
    });
});