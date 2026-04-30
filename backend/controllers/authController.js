import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

// Generar código único aleatorio
const generarCodigoUnico = (prefijo) => {
    return `${prefijo}-${Math.random().toString(36).substr(2, 9).toUpperCase()}-${Date.now()}`;
};

export const register = async (req, res) => {
    const { cedula, nombre, correo, password, rol } = req.body;

    if (!cedula || !nombre || !correo || !password) {
        return res.status(400).json({ mensaje: 'Cédula, nombre, correo y contraseña son obligatorios' });
    }

    try {
        // Verificar si la cédula ya existe
        const cedulaCheck = await pool.query('SELECT id FROM usuarios WHERE cedula = $1', [cedula]);
        if (cedulaCheck.rows.length > 0) {
            return res.status(400).json({ mensaje: 'La cédula ya está registrada' });
        }

        // Verificar si el correo ya existe
        const userCheck = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [correo]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ mensaje: 'El correo ya está registrado' });
        }

        // Hashear password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear usuario
        const resultUser = await pool.query(
            'INSERT INTO usuarios (cedula, nombre, correo, password, rol) VALUES ($1, $2, $3, $4, $5) RETURNING id, cedula, nombre, correo, rol',
            [cedula, nombre, correo, hashedPassword, rol || 'usuario']
        );
        const newUser = resultUser.rows[0];

        // Crear carnet automáticamente para el nuevo usuario
        const codigo_nfc = generarCodigoUnico('NFC');
        const codigo_qr = generarCodigoUnico('QR');

        await pool.query(
            'INSERT INTO carnet (usuario_id, codigo_nfc, codigo_qr) VALUES ($1, $2, $3)',
            [newUser.id, codigo_nfc, codigo_qr]
        );

        res.status(201).json({
            mensaje: 'Usuario registrado exitosamente',
            usuario: newUser
        });
    } catch (error) {
        console.error('Error en register:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor', error: error.message });
    }
};

export const login = async (req, res) => {
    const { correo, password } = req.body;

    if (!correo || !password) {
        return res.status(400).json({ mensaje: 'Correo y contraseña obligatorios' });
    }

    try {
        // Buscar usuario
        const result = await pool.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        const user = result.rows[0];

        // Validar password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ mensaje: 'Credenciales inválidas' });
        }

        // Obtener datos del carnet
        const carnetResult = await pool.query('SELECT codigo_nfc, codigo_qr FROM carnet WHERE usuario_id = $1', [user.id]);
        const carnet = carnetResult.rows[0];

        // Generar JWT
        const token = jwt.sign(
            { id: user.id, rol: user.rol },
            process.env.JWT_SECRET || 'super_secret',
            { expiresIn: '8h' }
        );

        res.json({
            mensaje: 'Login exitoso',
            token,
            usuario: {
                id: user.id,
                cedula: user.cedula,
                nombre: user.nombre,
                correo: user.correo,
                rol: user.rol,
                foto_url: user.foto_url || null,
                carnet
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
};

export const getUsuarios = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.cedula, u.nombre, u.correo, u.rol, c.codigo_nfc, c.codigo_qr 
            FROM usuarios u
            LEFT JOIN carnet c ON u.id = c.usuario_id
            ORDER BY u.id ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error en getUsuarios:', error);
        res.status(500).json({ mensaje: 'Error al obtener usuarios' });
    }
};

export const updateUsuario = async (req, res) => {
    const { id } = req.params;
    const { nombre, correo, rol } = req.body;

    try {
        const result = await pool.query(
            'UPDATE usuarios SET nombre = $1, correo = $2, rol = $3 WHERE id = $4 RETURNING id, cedula, nombre, correo, rol',
            [nombre, correo, rol, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        res.json({ mensaje: 'Usuario actualizado correctamente', usuario: result.rows[0] });
    } catch (error) {
        console.error('Error en updateUsuario:', error);
        res.status(500).json({ mensaje: 'Error al actualizar usuario' });
    }
};

export const deleteUsuario = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        res.json({ mensaje: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error('Error en deleteUsuario:', error);
        res.status(500).json({ mensaje: 'Error al eliminar usuario' });
    }
};

export const resetPassword = async (req, res) => {
    let { correo, cedula, nuevaPassword } = req.body;

    if (!correo || !cedula || !nuevaPassword) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
    }

    // Limpiar espacios en blanco accidentales y poner correo en minúsculas
    correo = correo.trim().toLowerCase();
    cedula = cedula.trim();

    try {
        // Verificar que el correo y la cédula coincidan (haciendo el correo insensible a mayúsculas en la BD)
        const userCheck = await pool.query('SELECT id FROM usuarios WHERE LOWER(correo) = $1 AND cedula = $2', [correo, cedula]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ mensaje: 'No se encontró ningún usuario con ese correo y cédula.' });
        }

        // Hashear nueva password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(nuevaPassword, salt);

        // Actualizar password
        await pool.query('UPDATE usuarios SET password = $1 WHERE correo = $2', [hashedPassword, correo]);

        res.json({ mensaje: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.' });
    } catch (error) {
        console.error('Error en resetPassword:', error);
        res.status(500).json({ mensaje: 'Error al restablecer la contraseña' });
    }
};
export const uploadFoto = async (req, res) => {
    const { id } = req.params;
    const { foto_url } = req.body; // Base64 string

    if (!foto_url) {
        return res.status(400).json({ mensaje: 'No se recibió ninguna imagen.' });
    }

    // Límite de tamaño ~2MB en Base64
    if (foto_url.length > 3 * 1024 * 1024) {
        return res.status(400).json({ mensaje: 'La imagen es muy grande. Máximo 2MB.' });
    }

    try {
        const result = await pool.query(
            'UPDATE usuarios SET foto_url = $1 WHERE id = $2 RETURNING id, foto_url',
            [foto_url, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }
        res.json({ mensaje: 'Foto actualizada correctamente.', foto_url: result.rows[0].foto_url });
    } catch (error) {
        console.error('Error en uploadFoto:', error);
        res.status(500).json({ mensaje: 'Error al guardar la foto.' });
    }
};
