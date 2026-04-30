import express from 'express';
import { register, login, getUsuarios, updateUsuario, deleteUsuario, resetPassword, uploadFoto } from '../controllers/authController.js';
import { registrarAcceso, getAccesos, getQrInfo } from '../controllers/accessController.js';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Autenticación & Usuarios
router.post('/register', register);
router.post('/login', login);
router.post('/reset-password', resetPassword);
router.get('/usuarios', verifyToken, verifyAdmin, getUsuarios); // Protegido
router.put('/usuarios/:id', verifyToken, verifyAdmin, updateUsuario); // Editar usuario
router.delete('/usuarios/:id', verifyToken, verifyAdmin, deleteUsuario); // Eliminar usuario

// Accesos
router.post('/acceso', registrarAcceso); // Kiosko o Lector (público o con API Key)
router.get('/accesos', verifyToken, verifyAdmin, getAccesos); // Visualizar logs (Admin)
router.put('/usuarios/:id/foto', verifyToken, uploadFoto); // Subir foto propia

export default router;

