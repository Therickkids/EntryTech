import config from '../config/env.js';

/**
 * Envío de correo a través de la API REST de Brevo.
 *
 * Se usa la interfaz HTTP y no una librería como nodemailer porque el proyecto
 * no incorpora dependencias nuevas: Node ya trae fetch, y la API de Brevo es
 * una petición JSON corriente.
 *
 * Brevo se eligió por una razón práctica: su plan gratuito permite verificar
 * una sola dirección de remitente, sin exigir un dominio propio. El sistema se
 * publica bajo un subdominio de Vercel, de modo que los proveedores que piden
 * verificación de dominio quedaban descartados.
 */

const URL_BREVO = 'https://api.brevo.com/v3/smtp/email';
const MS_TIEMPO_LIMITE = 10000;

/** Indica si el envío de correo está configurado. */
export const correoDisponible = () => Boolean(config.brevoApiKey && config.mailFromEmail);

/**
 * Envía un correo.
 *
 * Devuelve un objeto con el resultado en lugar de lanzar: quien llama necesita
 * distinguir un fallo de envío de un error de la petición, y en el flujo de
 * recuperación la respuesta al usuario es la misma en ambos casos.
 *
 * @returns {Promise<{enviado: boolean, motivo?: string}>}
 */
export const enviarCorreo = async ({ para, nombreDestino, asunto, html, texto }) => {
    if (!correoDisponible()) {
        return { enviado: false, motivo: 'sin-configurar' };
    }

    try {
        const respuesta = await fetch(URL_BREVO, {
            method: 'POST',
            headers: {
                'api-key': config.brevoApiKey,
                'content-type': 'application/json',
                accept: 'application/json',
            },
            body: JSON.stringify({
                sender: { email: config.mailFromEmail, name: config.mailFromNombre },
                to: [{ email: para, name: nombreDestino || undefined }],
                subject: asunto,
                htmlContent: html,
                textContent: texto,
            }),
            // Sin tiempo límite, un proveedor lento dejaría la petición del
            // usuario colgada hasta que el cliente se rinda.
            signal: AbortSignal.timeout(MS_TIEMPO_LIMITE),
        });

        if (!respuesta.ok) {
            /*
              Se registra el código y una pista de la causa, pero nunca el
              cuerpo completo: puede contener la dirección del destinatario.
              Un 401 desconcierta porque la clave «se ve» correcta, de ahí
              que convenga nombrar las causas habituales en el propio registro.
            */
            const pistas = {
                401: 'clave de API inválida, sin permisos o pegada con espacios',
                403: 'cuenta sin permiso para enviar; revisa la verificación del teléfono',
                400: 'remitente no verificado o distinto de MAIL_FROM_EMAIL',
            };
            const pista = pistas[respuesta.status] || 'consulta los registros de Brevo';
            console.error(`Fallo al enviar correo. Estado: ${respuesta.status} (${pista})`);
            return { enviado: false, motivo: `http-${respuesta.status}` };
        }

        return { enviado: true };
    } catch (error) {
        const motivo = error?.name === 'TimeoutError' ? 'tiempo-agotado' : 'sin-conexion';
        console.error('Fallo al enviar correo:', motivo);
        return { enviado: false, motivo };
    }
};
