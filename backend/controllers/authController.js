import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import config from '../config/env.js';
import {
    esCorreoValido,
    esCedulaValida,
    esNombreValido,
    validarPassword,
    normalizarCorreo,
    normalizarTexto,
} from '../utils/validators.js';

const SALT_ROUNDS = 10;

/**
 * Generador de códigos de carnet.
 * Antes usaba Math.random(), que no es criptográficamente seguro: conociendo
 * unos pocos códigos era posible predecir los siguientes y suplantar carnets.
 * Ahora se usa crypto.randomBytes.
 */
const generarCodigoUnico = (prefijo) =>
    `${prefijo}-${crypto.randomBytes(12).toString('base64url')}`;

export const register = async (req, res) => {
    const cedula = normalizarTexto(req.body.cedula);
    const nombre = normalizarTexto(req.body.nombre);
    const correo = normalizarCorreo(req.body.correo);
    const { password } = req.body;

    if (!cedula || !nombre || !correo || !password) {
        return res.status(400).json({ mensaje: 'Cédula, nombre, correo y contraseña son obligatorios.' });
    }
    if (!esCedulaValida(cedula)) {
        return res.status(400).json({ mensaje: 'La cédula debe contener entre 5 y 20 dígitos numéricos.' });
    }
    if (!esNombreValido(nombre)) {
        return res.status(400).json({ mensaje: 'El nombre debe tener entre 3 y 100 caracteres.' });
    }
    if (!esCorreoValido(correo)) {
        return res.status(400).json({ mensaje: 'El correo electrónico no tiene un formato válido.' });
    }
    const errorPassword = validarPassword(password);
    if (errorPassword) {
        return res.status(400).json({ mensaje: errorPassword });
    }

    const cliente = await pool.connect();

    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        /**
         * Todo el alta ocurre dentro de una transacción.
         * Antes el usuario y el carnet se insertaban por separado: si fallaba el
         * segundo INSERT quedaba un usuario sin carnet, que luego no podía
         * acceder al kiosco ni ver su QR.
         *
         * El rol se fuerza a 'usuario'. Antes se leía `rol` del cuerpo de la
         * petición, así que cualquiera podía registrarse como administrador
         * enviando {"rol":"admin"} y obtener acceso total al panel.
         */
        await cliente.query('BEGIN');

        const resultUser = await cliente.query(
            `INSERT INTO usuarios (cedula, nombre, correo, password, rol)
             VALUES ($1, $2, $3, $4, 'usuario')
             RETURNING id, cedula, nombre, correo, rol`,
            [cedula, nombre, correo, hashedPassword]
        );
        const nuevoUsuario = resultUser.rows[0];

        await cliente.query(
            'INSERT INTO carnet (usuario_id, codigo_nfc, codigo_qr) VALUES ($1, $2, $3)',
            [nuevoUsuario.id, generarCodigoUnico('NFC'), generarCodigoUnico('QR')]
        );

        await cliente.query('COMMIT');

        return res.status(201).json({
            mensaje: 'Usuario registrado exitosamente.',
            usuario: nuevoUsuario,
        });
    } catch (error) {
        await cliente.query('ROLLBACK').catch(() => {});

        // 23505 = violación de restricción UNIQUE. Se delega en la base de datos
        // en lugar de hacer un SELECT previo, que dejaba una ventana de carrera
        // entre la comprobación y el INSERT.
        if (error.code === '23505') {
            const campo = /cedula/.test(error.constraint || '') ? 'La cédula' : 'El correo';
            return res.status(409).json({ mensaje: `${campo} ya está registrado.` });
        }

        console.error('Error en register:', error);
        // No se devuelve error.message: antes se filtraban nombres de tablas y
        // restricciones internas de PostgreSQL al cliente.
        return res.status(500).json({ mensaje: 'Error interno del servidor.' });
    } finally {
        cliente.release();
    }
};

export const login = async (req, res) => {
    const correo = normalizarCorreo(req.body.correo);
    const { password } = req.body;

    if (!correo || !password) {
        return res.status(400).json({ mensaje: 'Correo y contraseña son obligatorios.' });
    }

    try {
        const result = await pool.query(
            `SELECT u.id, u.cedula, u.nombre, u.correo, u.password, u.rol, u.foto_url,
                    c.codigo_nfc, c.codigo_qr
             FROM usuarios u
             LEFT JOIN carnet c ON u.id = c.usuario_id
             WHERE LOWER(u.correo) = $1`,
            [correo]
        );

        const user = result.rows[0];

        /**
         * Respuesta uniforme para usuario inexistente y contraseña incorrecta.
         * Antes se devolvía 404 "Usuario no encontrado" frente a 401
         * "Credenciales inválidas", lo que permitía enumerar qué correos
         * existían en el sistema.
         */
        const hashComparable = user ? user.password : '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
        const isMatch = await bcrypt.compare(password, hashComparable);

        if (!user || !isMatch) {
            return res.status(401).json({ mensaje: 'Correo o contraseña incorrectos.' });
        }

        const token = jwt.sign(
            { id: user.id, rol: user.rol },
            config.jwtSecret,
            { expiresIn: config.jwtExpiresIn }
        );

        return res.json({
            mensaje: 'Login exitoso.',
            token,
            usuario: {
                id: user.id,
                cedula: user.cedula,
                nombre: user.nombre,
                correo: user.correo,
                rol: user.rol,
                foto_url: user.foto_url || null,
                carnet: user.codigo_nfc || user.codigo_qr
                    ? { codigo_nfc: user.codigo_nfc, codigo_qr: user.codigo_qr }
                    : null,
            },
        });
    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

export const getUsuarios = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.cedula, u.nombre, u.correo, u.rol, u.creado_en,
                    c.codigo_nfc, c.codigo_qr
             FROM usuarios u
             LEFT JOIN carnet c ON u.id = c.usuario_id
             ORDER BY u.id ASC`
        );
        return res.json(result.rows);
    } catch (error) {
        console.error('Error en getUsuarios:', error);
        return res.status(500).json({ mensaje: 'Error al obtener usuarios.' });
    }
};

/**
 * Alta de usuarios desde el panel de administración.
 * Es el endpoint que faltaba para que el CRUD del requisito RF-01 estuviera
 * realmente completo: la interfaz prometía "Crear" pero no existía la ruta.
 * A diferencia de /register, aquí sí se permite asignar el rol, porque el
 * llamante ya está verificado como administrador.
 */
export const crearUsuario = async (req, res) => {
    const cedula = normalizarTexto(req.body.cedula);
    const nombre = normalizarTexto(req.body.nombre);
    const correo = normalizarCorreo(req.body.correo);
    const { password } = req.body;
    const rol = req.body.rol === 'admin' ? 'admin' : 'usuario';

    if (!esCedulaValida(cedula)) {
        return res.status(400).json({ mensaje: 'La cédula debe contener entre 5 y 20 dígitos numéricos.' });
    }
    if (!esNombreValido(nombre)) {
        return res.status(400).json({ mensaje: 'El nombre debe tener entre 3 y 100 caracteres.' });
    }
    if (!esCorreoValido(correo)) {
        return res.status(400).json({ mensaje: 'El correo electrónico no tiene un formato válido.' });
    }
    const errorPassword = validarPassword(password);
    if (errorPassword) {
        return res.status(400).json({ mensaje: errorPassword });
    }

    const cliente = await pool.connect();

    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        await cliente.query('BEGIN');

        const resultUser = await cliente.query(
            `INSERT INTO usuarios (cedula, nombre, correo, password, rol)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, cedula, nombre, correo, rol`,
            [cedula, nombre, correo, hashedPassword, rol]
        );
        const nuevoUsuario = resultUser.rows[0];

        await cliente.query(
            'INSERT INTO carnet (usuario_id, codigo_nfc, codigo_qr) VALUES ($1, $2, $3)',
            [nuevoUsuario.id, generarCodigoUnico('NFC'), generarCodigoUnico('QR')]
        );

        await cliente.query('COMMIT');

        return res.status(201).json({ mensaje: 'Usuario creado correctamente.', usuario: nuevoUsuario });
    } catch (error) {
        await cliente.query('ROLLBACK').catch(() => {});

        if (error.code === '23505') {
            const campo = /cedula/.test(error.constraint || '') ? 'La cédula' : 'El correo';
            return res.status(409).json({ mensaje: `${campo} ya está registrado.` });
        }

        console.error('Error en crearUsuario:', error);
        return res.status(500).json({ mensaje: 'Error al crear el usuario.' });
    } finally {
        cliente.release();
    }
};

export const updateUsuario = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const nombre = normalizarTexto(req.body.nombre);
    const correo = normalizarCorreo(req.body.correo);
    const { rol } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ mensaje: 'Identificador de usuario inválido.' });
    }
    if (!esNombreValido(nombre)) {
        return res.status(400).json({ mensaje: 'El nombre debe tener entre 3 y 100 caracteres.' });
    }
    if (!esCorreoValido(correo)) {
        return res.status(400).json({ mensaje: 'El correo electrónico no tiene un formato válido.' });
    }
    if (rol !== 'admin' && rol !== 'usuario') {
        return res.status(400).json({ mensaje: 'El rol debe ser "admin" o "usuario".' });
    }

    /**
     * Un administrador no puede quitarse a sí mismo el rol de admin.
     * Antes era posible dejar el sistema sin ningún administrador y perder
     * el acceso al panel de forma irreversible.
     */
    if (id === req.user.id && rol !== 'admin') {
        return res.status(400).json({ mensaje: 'No puedes quitarte tu propio rol de administrador.' });
    }

    try {
        const result = await pool.query(
            `UPDATE usuarios SET nombre = $1, correo = $2, rol = $3
             WHERE id = $4
             RETURNING id, cedula, nombre, correo, rol`,
            [nombre, correo, rol, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        return res.json({ mensaje: 'Usuario actualizado correctamente.', usuario: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ mensaje: 'Ese correo ya pertenece a otro usuario.' });
        }
        console.error('Error en updateUsuario:', error);
        return res.status(500).json({ mensaje: 'Error al actualizar el usuario.' });
    }
};

export const deleteUsuario = async (req, res) => {
    const id = parseInt(req.params.id, 10);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ mensaje: 'Identificador de usuario inválido.' });
    }

    // Evita que un administrador borre su propia cuenta por error.
    if (id === req.user.id) {
        return res.status(400).json({ mensaje: 'No puedes eliminar tu propia cuenta.' });
    }

    try {
        const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        return res.json({ mensaje: 'Usuario eliminado correctamente.' });
    } catch (error) {
        // 23503 = violación de clave foránea. Ocurría porque las FK de carnet y
        // accesos se crearon sin ON DELETE CASCADE, pese a que la documentación
        // afirmaba lo contrario. El script migrations/001 lo corrige.
        if (error.code === '23503') {
            return res.status(409).json({
                mensaje: 'No se puede eliminar: el usuario tiene registros asociados. Aplica la migración 001.',
            });
        }
        console.error('Error en deleteUsuario:', error);
        return res.status(500).json({ mensaje: 'Error al eliminar el usuario.' });
    }
};

export const resetPassword = async (req, res) => {
    const correo = normalizarCorreo(req.body.correo);
    const cedula = normalizarTexto(req.body.cedula);
    const { nuevaPassword } = req.body;

    if (!correo || !cedula || !nuevaPassword) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
    }

    const errorPassword = validarPassword(nuevaPassword);
    if (errorPassword) {
        return res.status(400).json({ mensaje: errorPassword });
    }

    try {
        const userCheck = await pool.query(
            'SELECT id FROM usuarios WHERE LOWER(correo) = $1 AND cedula = $2',
            [correo, cedula]
        );

        if (userCheck.rows.length === 0) {
            return res.status(400).json({ mensaje: 'Los datos no coinciden con ningún usuario registrado.' });
        }

        const hashedPassword = await bcrypt.hash(nuevaPassword, SALT_ROUNDS);

        // Se actualiza por id en vez de por correo: con LOWER(correo) el índice
        // único no aplicaba y una coincidencia múltiple habría afectado a varias filas.
        await pool.query('UPDATE usuarios SET password = $1 WHERE id = $2', [
            hashedPassword,
            userCheck.rows[0].id,
        ]);

        return res.json({ mensaje: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.' });
    } catch (error) {
        console.error('Error en resetPassword:', error);
        return res.status(500).json({ mensaje: 'Error al restablecer la contraseña.' });
    }
};

export const uploadFoto = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { foto_url: fotoUrl } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ mensaje: 'Identificador de usuario inválido.' });
    }

    /**
     * Control de propiedad del recurso.
     * Antes bastaba con estar autenticado para hacer
     * PUT /api/usuarios/<cualquier-id>/foto y sustituir la foto de otra persona
     * (referencia directa insegura a objetos, IDOR).
     */
    if (id !== req.user.id && req.user.rol !== 'admin') {
        return res.status(403).json({ mensaje: 'Solo puedes modificar tu propia foto.' });
    }

    if (!fotoUrl || typeof fotoUrl !== 'string') {
        return res.status(400).json({ mensaje: 'No se recibió ninguna imagen.' });
    }

    // Se valida que sea realmente una imagen y no cualquier data URI (por
    // ejemplo text/html, que abriría la puerta a XSS almacenado al renderla).
    const cabecera = /^data:image\/(png|jpe?g|webp|gif);base64,/i;
    if (!cabecera.test(fotoUrl)) {
        return res.status(400).json({ mensaje: 'Formato no válido. Sube una imagen PNG, JPG, WEBP o GIF.' });
    }

    if (fotoUrl.length > 3 * 1024 * 1024) {
        return res.status(413).json({ mensaje: 'La imagen es demasiado grande. Máximo 2 MB.' });
    }

    try {
        const result = await pool.query(
            'UPDATE usuarios SET foto_url = $1 WHERE id = $2 RETURNING id, foto_url',
            [fotoUrl, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        return res.json({ mensaje: 'Foto actualizada correctamente.', foto_url: result.rows[0].foto_url });
    } catch (error) {
        console.error('Error en uploadFoto:', error);
        return res.status(500).json({ mensaje: 'Error al guardar la foto.' });
    }
};

/**
 * Devuelve el perfil del usuario autenticado a partir del token.
 * La interfaz dependía por completo de localStorage, así que los datos
 * quedaban desactualizados si un administrador cambiaba el rol o el nombre.
 */
export const getPerfil = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.cedula, u.nombre, u.correo, u.rol, u.foto_url,
                    c.codigo_nfc, c.codigo_qr
             FROM usuarios u
             LEFT JOIN carnet c ON u.id = c.usuario_id
             WHERE u.id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        const u = result.rows[0];
        return res.json({
            id: u.id,
            cedula: u.cedula,
            nombre: u.nombre,
            correo: u.correo,
            rol: u.rol,
            foto_url: u.foto_url || null,
            carnet: u.codigo_nfc || u.codigo_qr
                ? { codigo_nfc: u.codigo_nfc, codigo_qr: u.codigo_qr }
                : null,
        });
    } catch (error) {
        console.error('Error en getPerfil:', error);
        return res.status(500).json({ mensaje: 'Error al obtener el perfil.' });
    }
};
