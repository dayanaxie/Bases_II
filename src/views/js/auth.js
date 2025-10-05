// Verificar si el usuario está autenticado
export const isAuthenticated = () => {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    return user !== null && token !== null;
};

// Obtener datos del usuario
export const getCurrentUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

// Cerrar sesión
export const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login';
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

// Verificar token antes de cargar páginas protegidas
export function requireAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/login';
    return false;
  }
  return true;
}
