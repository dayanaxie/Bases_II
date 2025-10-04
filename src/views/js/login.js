document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('form');
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');
    const eyeIcon = togglePassword.querySelector('i');
    const submitBtn = document.querySelector('.confirm-button');
    
    // Función para mostrar mensajes
    function showMessage(message, type = 'success') {
        // Crear elemento de mensaje si no existe
        let messageDiv = document.getElementById('login-message');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'login-message';
            messageDiv.style.marginTop = '15px';
            messageDiv.style.padding = '10px';
            messageDiv.style.borderRadius = '5px';
            messageDiv.style.textAlign = 'center';
            messageDiv.style.fontWeight = 'bold';
            loginForm.parentNode.insertBefore(messageDiv, loginForm.nextSibling);
        }
        
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        messageDiv.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
        messageDiv.style.color = type === 'success' ? '#155724' : '#721c24';
        messageDiv.style.border = type === 'success' ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }

    // Toggle para mostrar/ocultar contraseña
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        if (type === 'text') {
            eyeIcon.classList.remove('fa-eye-slash');
            eyeIcon.classList.add('fa-eye');
            togglePassword.setAttribute('aria-label', 'Ocultar contraseña');
        } else {
            eyeIcon.classList.remove('fa-eye'); 
            eyeIcon.classList.add('fa-eye-slash');
            togglePassword.setAttribute('aria-label', 'Mostrar contraseña');
        }
    });

    // Manejar el envío del formulario
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Validaciones básicas
        if (!email || !password) {
            showMessage('Por favor completa todos los campos', 'error');
            return;
        }

        // Validar formato de email
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            showMessage('Por favor ingresa un correo electrónico válido', 'error');
            return;
        }

        // Cambiar estado del botón
        submitBtn.disabled = true;
        submitBtn.textContent = 'Iniciando sesión...';

        try {
            const response = await fetch('http://localhost:3000/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showMessage('¡Inicio de sesión exitoso! Redirigiendo...', 'success');
                
                // Guardar información del usuario en localStorage
                if (result.user) {
                    localStorage.setItem('user', JSON.stringify(result.user));
                }
                
                // Redirigir a la página de datasets
                setTimeout(() => {
                    if (result.user.tipoUsuario === 'admin') {
                        window.location.href = '/homeAdmin';
                    } else {
                        window.location.href = '/homeUser';
                    }
                }, 2000);
            } else {
                showMessage(result.message || 'Error al iniciar sesión', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error de conexión. Inténtalo de nuevo.', 'error');
        } finally {
            // Restaurar botón
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirmar';
        }
    });

    // Validación en tiempo real
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            // Limpiar mensajes cuando el usuario empiece a escribir
            const messageDiv = document.getElementById('login-message');
            if (messageDiv && messageDiv.style.display !== 'none') {
                messageDiv.style.display = 'none';
            }
        });
    });
});