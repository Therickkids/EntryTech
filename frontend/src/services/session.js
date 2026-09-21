/**
 * Punto único de acceso a la sesión.
 *
 * Antes cada pantalla leía y escribía localStorage por su cuenta con
 * JSON.parse sin protección: un valor corrupto lanzaba una excepción que
 * dejaba la aplicación en blanco. Además, las páginas guardaban los datos en
 * variables de módulo que sobrevivían al cierre de sesión, de modo que el
 * siguiente usuario que entraba en el mismo navegador veía por un instante los
 * registros del anterior.
 */

const CLAVE_TOKEN = 'token';
const CLAVE_USUARIO = 'usuario';

// Suscriptores que deben vaciar sus cachés al cerrar sesión.
const oyentesDeCierre = new Set();

export const alCerrarSesion = (callback) => {
    oyentesDeCierre.add(callback);
    return () => oyentesDeCierre.delete(callback);
};

export const obtenerToken = () => {
    try {
        return localStorage.getItem(CLAVE_TOKEN);
    } catch {
        return null;
    }
};

export const obtenerUsuario = () => {
    try {
        const crudo = localStorage.getItem(CLAVE_USUARIO);
        if (!crudo) return null;
        const valor = JSON.parse(crudo);
        return valor && typeof valor === 'object' ? valor : null;
    } catch {
        // Dato corrupto: se descarta en lugar de romper el render.
        try { localStorage.removeItem(CLAVE_USUARIO); } catch { /* almacenamiento no disponible */ }
        return null;
    }
};

export const guardarSesion = (token, usuario) => {
    try {
        localStorage.setItem(CLAVE_TOKEN, token);
        localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
    } catch {
        console.warn('No se pudo guardar la sesión: almacenamiento no disponible.');
    }
};

export const actualizarUsuario = (usuario) => {
    try {
        localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
    } catch {
        console.warn('No se pudo actualizar el usuario en almacenamiento local.');
    }
};

export const cerrarSesion = () => {
    try {
        localStorage.removeItem(CLAVE_TOKEN);
        localStorage.removeItem(CLAVE_USUARIO);
    } catch {
        /* almacenamiento no disponible */
    }
    oyentesDeCierre.forEach((callback) => {
        try { callback(); } catch { /* un oyente no debe impedir el cierre */ }
    });
};

export const esAdmin = () => obtenerUsuario()?.rol === 'admin';
