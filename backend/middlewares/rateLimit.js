/**
 * Limitador de peticiones en memoria, sin dependencias externas.
 *
 * Se implementa a mano a propósito: añadir express-rate-limit obligaría a
 * regenerar package-lock.json, y el despliegue de Render usa `npm ci`, que
 * falla si el lock no coincide exactamente con package.json.
 *
 * Limitación conocida: el contador vive en el proceso, así que con varias
 * instancias del backend cada una lleva su propia cuenta. Para una sola
 * instancia (el plan actual de Render) es suficiente.
 */

const almacen = new Map();

// Limpieza periódica para que el Map no crezca sin control.
const LIMPIEZA_MS = 10 * 60 * 1000;
const temporizador = setInterval(() => {
    const ahora = Date.now();
    for (const [clave, registro] of almacen.entries()) {
        if (registro.expiraEn <= ahora) almacen.delete(clave);
    }
}, LIMPIEZA_MS);

// No mantener vivo el proceso solo por la limpieza.
if (typeof temporizador.unref === 'function') temporizador.unref();

const obtenerIp = (req) => {
    const reenviada = req.headers['x-forwarded-for'];
    if (typeof reenviada === 'string' && reenviada.length > 0) {
        return reenviada.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'desconocida';
};

/**
 * @param {object} opciones
 * @param {number} opciones.ventanaMs  Duración de la ventana en milisegundos.
 * @param {number} opciones.maximo     Peticiones permitidas dentro de la ventana.
 * @param {string} opciones.nombre     Etiqueta para separar contadores por ruta.
 */
export const rateLimit = ({ ventanaMs, maximo, nombre = 'global' }) => {
    return (req, res, next) => {
        const clave = `${nombre}:${obtenerIp(req)}`;
        const ahora = Date.now();
        const registro = almacen.get(clave);

        if (!registro || registro.expiraEn <= ahora) {
            almacen.set(clave, { conteo: 1, expiraEn: ahora + ventanaMs });
            return next();
        }

        registro.conteo += 1;

        if (registro.conteo > maximo) {
            const segundos = Math.ceil((registro.expiraEn - ahora) / 1000);
            res.set('Retry-After', String(segundos));
            return res.status(429).json({
                mensaje: `Demasiados intentos. Vuelve a intentarlo en ${segundos} segundos.`,
            });
        }

        return next();
    };
};

export default rateLimit;
