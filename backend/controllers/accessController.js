import pool from '../config/db.js';

export const registrarAcceso = async (req, res) => {
    // codigo puede ser NFC o QR
    const { codigo } = req.body; 

    if (!codigo) {
        return res.status(400).json({ mensaje: 'Falta proveer el código de carnet (NFC o QR)' });
    }

    try {
        // 1. Buscar a qué usuario pertenece el código
        const carnetQuery = await pool.query(
            'SELECT usuario_id FROM carnet WHERE codigo_nfc = $1 OR codigo_qr = $1',
            [codigo]
        );

        if (carnetQuery.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Código inválido o no reconocido. Acceso denegado.' });
        }

        const usuario_id = carnetQuery.rows[0].usuario_id;

        // 2. Obtener la última acción de este usuario
        const lastAccessQuery = await pool.query(
            'SELECT tipo FROM accesos WHERE usuario_id = $1 ORDER BY fecha DESC LIMIT 1',
            [usuario_id]
        );

        let ultimoTipo = null;
        if (lastAccessQuery.rows.length > 0) {
            ultimoTipo = lastAccessQuery.rows[0].tipo;
        }

        // 3. Determinar el nuevo tipo y validar regla de negocio
        let nuevoTipo;

        if (ultimoTipo === 'entrada') {
            // Regla Anti-Passback: Si su último registro fue entrar, ahora debe salir.
            nuevoTipo = 'salida';
        } else if (ultimoTipo === 'salida' || ultimoTipo === null) {
            // Si salió o es su primer acceso en la historia, entonces entra.
            nuevoTipo = 'entrada';
        }

        // 4. Registrar en la base de datos
        await pool.query(
            'INSERT INTO accesos (usuario_id, tipo) VALUES ($1, $2)',
            [usuario_id, nuevoTipo]
        );

        res.json({
            mensaje: `Acceso autorizado (${nuevoTipo})`,
            usuario_id,
            tipo: nuevoTipo
        });

    } catch (error) {
        console.error('Error en registrarAcceso:', error);
        res.status(500).json({ mensaje: 'Error al registrar el acceso' });
    }
};

export const getAccesos = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.id, a.tipo, a.fecha, u.nombre, u.correo, u.cedula
            FROM accesos a
            INNER JOIN usuarios u ON a.usuario_id = u.id
            ORDER BY a.fecha DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error en getAccesos:', error);
        res.status(500).json({ mensaje: 'Error al obtener el historial de accesos' });
    }
};

// Bonus: Traer info del QR para visualizacion
export const getQrInfo = async (req, res) => {
    const { id } = req.params; // usuario_id
    try {
        const result = await pool.query('SELECT codigo_qr, codigo_nfc FROM carnet WHERE usuario_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Carnet no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error en getQrInfo:', error);
        res.status(500).json({ mensaje: 'Error interno' });
    }
};
