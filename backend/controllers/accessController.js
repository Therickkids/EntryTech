import crypto from 'crypto';
import pool from '../config/db.js';

const generarCodigoQr = () => `QR-${crypto.randomBytes(12).toString('base64url')}`;

/**
 * Registra una entrada o salida a partir del código del carnet (NFC o QR).
 *
 * Toda la operación se ejecuta dentro de una transacción con bloqueo de fila.
 * Antes eran cuatro consultas independientes: dos lecturas del kiosco casi
 * simultáneas podían leer el mismo "último tipo" y registrar dos entradas
 * seguidas, rompiendo justo la regla Anti-Passback que el sistema promete.
 * El bloqueo también garantiza que un código de un solo uso no pueda
 * canjearse dos veces.
 */
export const registrarAcceso = async (req, res) => {
    const { codigo } = req.body;

    if (!codigo || typeof codigo !== 'string' || codigo.length > 255) {
        return res.status(400).json({ mensaje: 'Falta proveer un código de carnet válido (NFC o QR).' });
    }

    const cliente = await pool.connect();

    try {
        await cliente.query('BEGIN');

        // FOR UPDATE bloquea la fila del carnet hasta el COMMIT.
        const carnetQuery = await cliente.query(
            `SELECT c.usuario_id, u.nombre, u.cedula
             FROM carnet c
             INNER JOIN usuarios u ON u.id = c.usuario_id
             WHERE c.codigo_nfc = $1 OR c.codigo_qr = $1
             FOR UPDATE OF c`,
            [codigo]
        );

        if (carnetQuery.rows.length === 0) {
            await cliente.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'Código inválido o ya utilizado. Acceso denegado.' });
        }

        const { usuario_id: usuarioId, nombre, cedula } = carnetQuery.rows[0];

        const ultimoAcceso = await cliente.query(
            'SELECT tipo FROM accesos WHERE usuario_id = $1 ORDER BY fecha DESC, id DESC LIMIT 1',
            [usuarioId]
        );

        const ultimoTipo = ultimoAcceso.rows[0]?.tipo ?? null;
        // Cualquier valor distinto de 'entrada' se trata como "está fuera".
        // Antes, un tipo inesperado dejaba nuevoTipo en undefined y el INSERT
        // fallaba con un error 500 poco claro.
        const nuevoTipo = ultimoTipo === 'entrada' ? 'salida' : 'entrada';

        const insertado = await cliente.query(
            'INSERT INTO accesos (usuario_id, tipo) VALUES ($1, $2) RETURNING id, fecha',
            [usuarioId, nuevoTipo]
        );

        // Rotación del código QR: lo convierte en un código de un solo uso.
        const nuevoQR = generarCodigoQr();
        await cliente.query('UPDATE carnet SET codigo_qr = $1 WHERE usuario_id = $2', [
            nuevoQR,
            usuarioId,
        ]);

        await cliente.query('COMMIT');

        /**
         * La respuesta incluye los datos del usuario. Antes solo devolvía
         * usuario_id, pero el simulador leía `res.data.usuario.nombre`, así que
         * la pantalla de confirmación siempre mostraba el texto "Usuario".
         */
        return res.json({
            mensaje: `Acceso autorizado (${nuevoTipo})`,
            tipo: nuevoTipo,
            fecha: insertado.rows[0].fecha,
            usuario: { id: usuarioId, nombre, cedula },
        });
    } catch (error) {
        await cliente.query('ROLLBACK').catch(() => {});
        console.error('Error en registrarAcceso:', error);
        return res.status(500).json({ mensaje: 'Error al registrar el acceso.' });
    } finally {
        cliente.release();
    }
};

/**
 * Historial de accesos con paginación opcional.
 * Antes devolvía la tabla completa en cada llamada y el panel la recargaba cada
 * 30 segundos: con unos pocos miles de registros la respuesta pesaba megabytes
 * y el navegador renderizaba todas las filas de golpe.
 * Sin parámetros mantiene el comportamiento anterior (tope de seguridad).
 */
export const getAccesos = async (req, res) => {
    const limite = Math.min(parseInt(req.query.limit, 10) || 500, 1000);
    const desplazamiento = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    try {
        const [registros, total] = await Promise.all([
            pool.query(
                `SELECT a.id, a.tipo, a.fecha, u.nombre, u.correo, u.cedula
                 FROM accesos a
                 INNER JOIN usuarios u ON a.usuario_id = u.id
                 ORDER BY a.fecha DESC, a.id DESC
                 LIMIT $1 OFFSET $2`,
                [limite, desplazamiento]
            ),
            pool.query('SELECT COUNT(*)::int AS total FROM accesos'),
        ]);

        res.set('X-Total-Count', String(total.rows[0].total));
        return res.json(registros.rows);
    } catch (error) {
        console.error('Error en getAccesos:', error);
        return res.status(500).json({ mensaje: 'Error al obtener el historial de accesos.' });
    }
};

/**
 * Devuelve el código vigente del carnet.
 * Antes cualquier usuario autenticado podía consultar /api/usuarios/<id>/qr de
 * otra persona y obtener su código activo, con el que el kiosco le habría
 * abierto la puerta en su nombre: suplantación completa de identidad.
 */
export const getQrInfo = async (req, res) => {
    const id = parseInt(req.params.id, 10);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ mensaje: 'Identificador de usuario inválido.' });
    }

    if (id !== req.user.id && req.user.rol !== 'admin') {
        return res.status(403).json({ mensaje: 'Solo puedes consultar tu propio carnet.' });
    }

    try {
        const result = await pool.query(
            'SELECT codigo_qr, codigo_nfc FROM carnet WHERE usuario_id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Carnet no encontrado.' });
        }

        return res.json(result.rows[0]);
    } catch (error) {
        console.error('Error en getQrInfo:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

/**
 * Historial propio del usuario autenticado (HU008).
 * La historia de usuario pedía "consultar mi historial", pero la única ruta
 * existente era /api/accesos, restringida a administradores.
 */
export const getMisAccesos = async (req, res) => {
    const limite = Math.min(parseInt(req.query.limit, 10) || 100, 500);

    try {
        const result = await pool.query(
            `SELECT id, tipo, fecha
             FROM accesos
             WHERE usuario_id = $1
             ORDER BY fecha DESC, id DESC
             LIMIT $2`,
            [req.user.id, limite]
        );
        return res.json(result.rows);
    } catch (error) {
        console.error('Error en getMisAccesos:', error);
        return res.status(500).json({ mensaje: 'Error al obtener tu historial.' });
    }
};
