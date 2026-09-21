/**
 * Validaciones de entrada compartidas por los controladores.
 * Antes ningún endpoint validaba formato: se aceptaban correos inválidos,
 * contraseñas de un carácter y cédulas con cualquier contenido.
 */

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_CEDULA = /^\d{5,20}$/;

export const PASSWORD_MIN = 8;

export const esCorreoValido = (valor) =>
    typeof valor === 'string' && valor.length <= 100 && RE_CORREO.test(valor.trim());

export const esCedulaValida = (valor) =>
    typeof valor === 'string' && RE_CEDULA.test(valor.trim());

export const esNombreValido = (valor) =>
    typeof valor === 'string' && valor.trim().length >= 3 && valor.trim().length <= 100;

/**
 * Exige longitud mínima y algo de variedad. No pretende ser una política
 * corporativa completa, pero evita contraseñas de un solo carácter.
 */
export const validarPassword = (valor) => {
    if (typeof valor !== 'string' || valor.length < PASSWORD_MIN) {
        return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
    }
    if (valor.length > 72) {
        // bcrypt trunca en 72 bytes: más allá de eso los caracteres se ignoran.
        return 'La contraseña no puede superar los 72 caracteres.';
    }
    if (!/[a-zA-Z]/.test(valor) || !/\d/.test(valor)) {
        return 'La contraseña debe combinar letras y números.';
    }
    return null;
};

export const normalizarCorreo = (valor) =>
    typeof valor === 'string' ? valor.trim().toLowerCase() : '';

export const normalizarTexto = (valor) =>
    typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
