document.addEventListener('DOMContentLoaded', function() {
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');
    const eyeIcon = togglePassword.querySelector('i');
    
    togglePassword.addEventListener('click', function() {
        // Cambiar el tipo de input entre password y text
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Cambiar el icono
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
});