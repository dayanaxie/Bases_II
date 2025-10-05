// middleware/auth.js
export const requireAuth = (req, res, next) => {    
    next(); // Por ahora permitimos el acceso, la protección estará en el frontend
};

export const apiAuth = async (req, res, next) => {
    try {
        // Para APIs, podríamos verificar un token JWT
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Acceso no autorizado'
            });
        }
        
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Token inválido'
        });
    }
};