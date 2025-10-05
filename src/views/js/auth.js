
// Verificar si el usuario está autenticado
export const isAuthenticated = () => {
    const user = localStorage.getItem('user');
    return user !== null;
};

// Obtener datos del usuario
export const getCurrentUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

// Cerrar sesión
export const logout = () => {
    localStorage.removeItem('user');
    window.location.href = '/login';
};

// Verificar autenticación y redirigir si no está logueado
export const requireAuth = () => {
    if (!isAuthenticated()) {
        window.location.href = '/login';
        return false;
    }
    return true;
};

// Verificar si es admin
export const isAdmin = () => {
    const user = getCurrentUser();
    return user && user.tipoUsuario === 'admin';
};

// Redirigir según el tipo de usuario
export const redirectByUserType = () => {
    const user = getCurrentUser();
    if (!user) return '/login';
    
    return user.tipoUsuario === 'admin' ? '/homeAdmin' : '/homeUser';
};