import bcrypt from 'bcrypt';

import pool from '../config/db.js';
import config from '../config/env.js';
import { enviarCorreo, correoDisponible } from '../services/correo.js';
import { normalizarCorreo, validarPassword } from '../utils/validators.js';
import {
    MINUTOS_VALIDEZ,
    construirEnlace,
    generarToken,
    hashToken,
    plantillaCorreo,
    tokenVigente,
} from '../utils/recuperacion.js';

const SALT_ROUNDS = 10;

/*
  Respuesta única de la solicitud.

  Es deliberadamente vaga y se devuelve siempre, exista o no la cuenta. Si el
  sistema contestara "no encontramos ese correo", cualquiera podría averiguar
  qué direcciones están registradas probando una lista, que es justo lo que se
  corrigió en el inicio de sesión.
*/
const RESPUESTA_GENERICA = {
    mensaje: 'Si ese correo corresponde a una cuenta, te enviamos un enlace para '
        + 'restablecer la contraseña. Revisa tu bandeja de entrada y la carpeta de no deseados.',
};

/**
 * Paso 1: el usuario pide recuperar su contraseña.
 *
 * Sustituye al mecanismo anterior, que cambiaba la contraseña presentando
 * correo y cédula. En Colombia la cédula no es un dato secreto —aparece en
 * contratos, formularios y filtraciones—, de modo que aquello permitía
 * apoderarse de una cuenta conociendo dos datos públicos. Ahora la prueba de
 * identidad es el acceso al buzón de correo registrado.
 */
export const solicitarRecuperacion = async (req, res) => {
    const correo = normalizarCorreo(req.body?.correo);

    if (!correo) {
        return res.status(400).json({ mensaje: 'Indica tu correo electrónico.' });
    }

    /*
      Que el envío no esté configurado es un problema de operación, no de la
      cuenta: decirlo no revela nada del usuario y evita que alguien espere un
      correo que nunca va a llegar.
    */
    if (!correoDisponible()) {
        console.error('Recuperación solicitada sin BREVO_API_KEY ni MAIL_FROM_EMAIL configurados.');
        return res.status(503).json({
            mensaje: 'La recuperación por correo no está disponible en este momento. '
                + 'Contacta con un administrador.',
        });
    }

    try {
        const resultado = await pool.query(
            'SELECT id, nombre, correo FROM usuarios WHERE LOWER(correo) = $1',
            [correo]
        );
        const usuario = resultado.rows[0];

        // Sin cuenta no se hace nada, pero la respuesta es la misma.
        if (!usuario) {
            return res.json(RESPUESTA_GENERICA);
        }

        const { token, hash } = generarToken();
        const expira = new Date(Date.now() + MINUTOS_VALIDEZ * 60 * 1000);

        const cliente = await pool.connect().catch(() => null);
        if (!cliente) {
            return res.status(503).json({ mensaje: 'Servicio no disponible. Inténtalo más tarde.' });
        }

        try {
            await cliente.query('BEGIN');

            /*
              Los enlaces anteriores que siguieran vigentes se anulan. Si no,
              pedir el correo varias veces dejaría varios enlaces válidos a la
              vez y bastaría con que uno solo se filtrara.
            */
            await cliente.query(
                `UPDATE tokens_recuperacion SET usado_en = CURRENT_TIMESTAMP
                 WHERE usuario_id = $1 AND usado_en IS NULL`,
                [usuario.id]
            );

            await cliente.query(
                `INSERT INTO tokens_recuperacion (usuario_id, token_hash, expira_en)
                 VALUES ($1, $2, $3)`,
                [usuario.id, hash, expira]
            );

            await cliente.query('COMMIT');
        } catch (error) {
            await cliente.query('ROLLBACK').catch(() => {});
            throw error;
        } finally {
            cliente.release();
        }

        const enlace = construirEnlace(config.appUrl, token);
        const { asunto, html, texto } = plantillaCorreo({
            nombre: usuario.nombre?.split(' ')[0],
            enlace,
        });

        const envio = await enviarCorreo({
            para: usuario.correo,
            nombreDestino: usuario.nombre,
            asunto,
            html,
            texto,
        });

        if (!envio.enviado) {
            // Se registra el motivo para poder diagnosticarlo, pero al usuario
            // se le responde igual que siempre.
            console.error('No se pudo enviar el correo de recuperación:', envio.motivo);
        }

        return res.json(RESPUESTA_GENERICA);
    } catch (error) {
        console.error('Error en solicitarRecuperacion:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
};

/**
 * Paso 2: el usuario abre el enlace y elige su nueva contraseña.
 */
export const confirmarRecuperacion = async (req, res) => {
    const token = req.body?.token;
    const nuevaPassword = req.body?.nuevaPassword;

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ mensaje: 'El enlace de recuperación no es válido.' });
    }

    const errorPassword = validarPassword(nuevaPassword);
    if (errorPassword) {
        return res.status(400).json({ mensaje: errorPassword });
    }

    const cliente = await pool.connect().catch(() => null);
    if (!cliente) {
        return res.status(503).json({ mensaje: 'Servicio no disponible. Inténtalo más tarde.' });
    }

    try {
        await cliente.query('BEGIN');

        /*
          FOR UPDATE bloquea la fila hasta el COMMIT: impide que dos peticiones
          simultáneas con el mismo enlace lo canjeen las dos.
        */
        const resultado = await cliente.query(
            `SELECT id, usuario_id, expira_en, usado_en
             FROM tokens_recuperacion
             WHERE token_hash = $1
             FOR UPDATE`,
            [hashToken(token)]
        );
        const registro = resultado.rows[0];

        if (!tokenVigente(registro)) {
            await cliente.query('ROLLBACK');
            // Un mismo mensaje para enlace inexistente, caducado o ya usado:
            // distinguirlos solo ayudaría a quien esté probando enlaces.
            return res.status(400).json({
                mensaje: 'El enlace no es válido o ya expiró. Solicita uno nuevo.',
            });
        }

        const hashed = await bcrypt.hash(nuevaPassword, SALT_ROUNDS);

        await cliente.query('UPDATE usuarios SET password = $1 WHERE id = $2', [
            hashed,
            registro.usuario_id,
        ]);

        // Se marca este y se anulan los demás del mismo usuario.
        await cliente.query(
            `UPDATE tokens_recuperacion SET usado_en = CURRENT_TIMESTAMP
             WHERE usuario_id = $1 AND usado_en IS NULL`,
            [registro.usuario_id]
        );

        await cliente.query('COMMIT');

        return res.json({
            mensaje: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
        });
    } catch (error) {
        await cliente.query('ROLLBACK').catch(() => {});
        console.error('Error en confirmarRecuperacion:', error);
        return res.status(500).json({ mensaje: 'Error interno del servidor.' });
    } finally {
        cliente.release();
    }
};
