import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  try {
    // Obtener encabezado "Authorization"
    const authHeader = req.headers.authorization;

    // Si no hay token o no sigue el formato correcto
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Acceso no autorizado: token no proporcionado",
      });
    }

    // Extraer token
    const token = authHeader.split(" ")[1];

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Guardar datos del usuario dentro del request (para usarlos en las rutas)
    req.user = decoded;

    next(); // pasa al siguiente middleware o controlador
  } catch (error) {
    // Manejar casos de token expirado o inválido
    return res.status(403).json({
      success: false,
      message: "Token inválido o expirado",
    });
  }
};
