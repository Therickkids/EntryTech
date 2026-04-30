import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ mensaje: 'No se proporcionó un token de seguridad.' });
    }

    try {
        const decoded = jwt.verify(token.split(' ')[1] || token, process.env.JWT_SECRET || 'super_secret');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ mensaje: 'Token inválido o expirado.' });
    }
};

export const verifyAdmin = (req, res, next) => {
    if (!req.user || req.user.rol !== 'admin') {
        return res.status(403).json({ mensaje: 'Requiere permisos de administrador.' });
    }
    next();
};
