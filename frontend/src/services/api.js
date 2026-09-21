import axios from 'axios';
import { obtenerToken, cerrarSesion } from './session';

/**
 * Construcción de la URL base.
 *
 * El manual de instalación indica VITE_API_URL=http://localhost:5000, pero el
 * código anterior usaba ese valor tal cual y todas las llamadas iban a
 * /login en vez de /api/login, devolviendo 404 en cualquier entorno local.
 * Aquí se añade el sufijo /api cuando falta, de modo que ambas formas
 * (con y sin /api) funcionan.
 */
const normalizarBaseURL = (valor) => {
    const base = (valor || 'https://entrytech-backend.onrender.com').trim().replace(/\/+$/, '');
    return /\/api$/.test(base) ? base : `${base}/api`;
};

const api = axios.create({
    baseURL: normalizarBaseURL(import.meta.env.VITE_API_URL),
    // Sin tiempo límite, una instancia dormida de Render dejaba la interfaz
    // bloqueada indefinidamente en "Ingresando...".
    timeout: 30000,
});

api.interceptors.request.use((config) => {
    const token = obtenerToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * Manejo global de sesión caducada.
 * Antes, al expirar el token (8 h) las pantallas protegidas se quedaban vacías
 * sin explicación, porque nadie interpretaba el 401 del servidor.
 */
api.interceptors.response.use(
    (respuesta) => respuesta,
    (error) => {
        const estado = error.response?.status;
        const ruta = error.config?.url || '';
        const esRutaPublica = /\/(login|register|reset-password)$/.test(ruta);

        if (estado === 401 && !esRutaPublica) {
            cerrarSesion();
            if (window.location.pathname !== '/login') {
                window.location.replace('/login?sesion=expirada');
            }
        }

        if (!error.response) {
            error.mensajeAmigable = error.code === 'ECONNABORTED'
                ? 'El servidor tardó demasiado en responder. Inténtalo de nuevo.'
                : 'No se pudo conectar con el servidor. Revisa tu conexión.';
        }

        return Promise.reject(error);
    }
);

/** Extrae un mensaje legible de cualquier error de Axios. */
export const mensajeDeError = (error, porDefecto = 'Ocurrió un error inesperado.') =>
    error?.response?.data?.mensaje || error?.mensajeAmigable || porDefecto;

export default api;
