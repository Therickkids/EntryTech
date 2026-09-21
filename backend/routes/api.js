import express from 'express';
import {
    register,
    login,
    getUsuarios,
    crearUsuario,
    updateUsuario,
    deleteUsuario,
    resetPassword,
    uploadFoto,
    getPerfil,
} from '../controllers/authController.js';
import {
    registrarAcceso,
    getAccesos,
    getQrInfo,
    getMisAccesos,
} from '../controllers/accessController.js';
import { getFondo } from '../controllers/fondoController.js';
import { verifyToken, verifyAdmin, verifyKiosk } from '../middlewares/authMiddleware.js';
import { rateLimit } from '../middlewares/rateLimit.js';

const router = express.Router();

/**
 * Límites por IP. Antes ningún endpoint los tenía: /api/login admitía miles de
 * intentos por minuto, lo que hacía viable un ataque de fuerza bruta contra
 * cualquier cuenta, y /api/register permitía inundar la base de datos.
 */
const limiteLogin = rateLimit({ ventanaMs: 15 * 60 * 1000, maximo: 10, nombre: 'login' });
const limiteRegistro = rateLimit({ ventanaMs: 60 * 60 * 1000, maximo: 5, nombre: 'registro' });
const limiteReset = rateLimit({ ventanaMs: 60 * 60 * 1000, maximo: 5, nombre: 'reset' });
const limiteAcceso = rateLimit({ ventanaMs: 60 * 1000, maximo: 60, nombre: 'acceso' });

// Comprobación de salud (Render duerme las instancias del plan gratuito).
router.get('/ping', (req, res) => res.status(200).json({ mensaje: 'pong' }));

/*
  Fondo diario de la pantalla de acceso. Es público a la fuerza: lo consulta el
  login antes de que exista sesión. Solo devuelve la dirección de una imagen de
  la NASA, sin ningún dato del sistema.
*/
router.get('/fondo', rateLimit({ ventanaMs: 60 * 1000, maximo: 120, nombre: 'fondo' }), getFondo);

// Autenticación
router.post('/register', limiteRegistro, register);
router.post('/login', limiteLogin, login);
router.post('/reset-password', limiteReset, resetPassword);

// Perfil propio
router.get('/perfil', verifyToken, getPerfil);
router.get('/mis-accesos', verifyToken, getMisAccesos);

// Gestión de usuarios (solo administradores)
router.get('/usuarios', verifyToken, verifyAdmin, getUsuarios);
router.post('/usuarios', verifyToken, verifyAdmin, crearUsuario);
router.put('/usuarios/:id', verifyToken, verifyAdmin, updateUsuario);
router.delete('/usuarios/:id', verifyToken, verifyAdmin, deleteUsuario);

// Carnet y foto: la comprobación de propiedad se hace dentro del controlador.
router.get('/usuarios/:id/qr', verifyToken, getQrInfo);
router.put('/usuarios/:id/foto', verifyToken, uploadFoto);

// Accesos
router.post('/acceso', limiteAcceso, verifyKiosk, registrarAcceso);
router.get('/accesos', verifyToken, verifyAdmin, getAccesos);

export default router;
