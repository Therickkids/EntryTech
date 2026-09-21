import jwt from 'jsonwebtoken';
import config from '../config/env.js';

export const verifyToken = (req, res, next) => {
    const cabecera = req.headers.authorization || '';

    // Antes se aceptaba tanto "Bearer <token>" como el token pelado; ahora se
    // exige el esquema estándar para evitar formatos ambiguos.
    const [esquema, token] = cabecera.split(' ');

    if (!token || esquema !== 'Bearer') {
        // 401: falta autenticación. Antes devolvía 403, que significa
        // "autenticado pero sin permiso", y el frontend no podía distinguir
        // una sesión caducada de una falta de permisos.
        return res.status(401).json({ mensaje: 'No se proporcionó un token de seguridad.' });
    }

    try {
        req.user = jwt.verify(token, config.jwtSecret);
        return next();
    } catch (error) {
        const expirado = error.name === 'TokenExpiredError';
        return res.status(401).json({
            mensaje: expirado ? 'Tu sesión ha expirado. Inicia sesión de nuevo.' : 'Token inválido.',
        });
    }
};

export const verifyAdmin = (req, res, next) => {
    if (!req.user || req.user.rol !== 'admin') {
        return res.status(403).json({ mensaje: 'Requiere permisos de administrador.' });
    }
    return next();
};

/**
 * Protege el endpoint del kiosco.
 * POST /api/acceso era completamente público: cualquiera con un código de
 * carnet ajeno podía registrar entradas y salidas desde internet. Si se define
 * KIOSK_API_KEY el terminal debe enviarla en la cabecera X-Kiosk-Key; también
 * se acepta un token JWT válido, que es como opera el simulador web.
 */
export const verifyKiosk = (req, res, next) => {
    if (config.kioskApiKey) {
        const clave = req.headers['x-kiosk-key'];
        if (clave === config.kioskApiKey) return next();
    }

    const cabecera = req.headers.authorization || '';
    const [esquema, token] = cabecera.split(' ');

    if (esquema === 'Bearer' && token) {
        try {
            req.user = jwt.verify(token, config.jwtSecret);
            return next();
        } catch {
            return res.status(401).json({ mensaje: 'Sesión inválida o expirada.' });
        }
    }

    // Sin KIOSK_API_KEY configurada se conserva el acceso abierto para no
    // romper terminales físicos ya desplegados, pero se deja constancia.
    if (!config.kioskApiKey) {
        if (config.isProduction) {
            console.warn('⚠️  POST /api/acceso recibido sin autenticación: define KIOSK_API_KEY.');
        }
        return next();
    }

    return res.status(401).json({ mensaje: 'El terminal no está autorizado.' });
};
