import crypto from 'crypto';

/**
 * Piezas puras del flujo de recuperación de contraseña.
 *
 * Se mantienen separadas del controlador para poder probarlas sin base de
 * datos ni red: aquí vive la lógica que decide qué es un token válido y qué
 * texto recibe el usuario.
 */

/** Validez del enlace. Suficiente para revisar el correo, corta para un robo. */
export const MINUTOS_VALIDEZ = 60;

/**
 * Genera un token de recuperación.
 *
 * Devuelve el valor en claro, que viaja por correo y nunca se almacena, y su
 * huella SHA-256, que es lo único que se guarda en la base de datos. Si
 * alguien leyera la tabla no podría reconstruir el enlace.
 *
 * 32 bytes aleatorios equivalen a 256 bits de entropía: adivinarlo por fuerza
 * bruta no es viable.
 */
export const generarToken = () => {
    const token = crypto.randomBytes(32).toString('base64url');
    return { token, hash: hashToken(token) };
};

/** Huella del token, en hexadecimal de 64 caracteres. */
export const hashToken = (token) =>
    crypto.createHash('sha256').update(String(token)).digest('hex');

/**
 * Compara dos huellas en tiempo constante.
 *
 * Una comparación normal se detiene en el primer carácter distinto, y el
 * tiempo que tarda revela cuántos coincidían. Con suficientes intentos eso
 * permite reconstruir el valor carácter a carácter.
 */
export const hashesIguales = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
        return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

/** Enlace que recibe el usuario. */
export const construirEnlace = (urlBase, token) =>
    `${String(urlBase).replace(/\/+$/, '')}/recuperar/${encodeURIComponent(token)}`;

/** Un token sirve si no se ha usado y no ha caducado. */
export const tokenVigente = (registro, ahora = new Date()) => {
    if (!registro) return false;
    if (registro.usado_en) return false;
    return new Date(registro.expira_en).getTime() > ahora.getTime();
};

const escaparHtml = (t) =>
    String(t)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

/**
 * Texto del correo de recuperación.
 *
 * Se envía en HTML y en texto plano: algunos clientes bloquean el primero, y
 * un correo que llega vacío es peor que no enviarlo.
 */
export const plantillaCorreo = ({ nombre, enlace, minutos = MINUTOS_VALIDEZ }) => {
    const saludo = nombre ? `Hola ${nombre},` : 'Hola,';

    const texto = [
        saludo,
        '',
        'Recibimos una solicitud para restablecer la contraseña de tu cuenta en EntryTech.',
        '',
        `Abre este enlace para elegir una nueva contraseña (válido ${minutos} minutos y de un solo uso):`,
        enlace,
        '',
        'Si no fuiste tú, puedes ignorar este mensaje: tu contraseña no cambiará.',
        '',
        'EntryTech · Sistema Inteligente de Acceso',
    ].join('\n');

    const html = `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e3e6ea">
    <p style="margin:0 0 4px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#6366f1;font-weight:700">EntryTech</p>
    <h1 style="margin:0 0 20px;font-size:20px">Restablecer tu contraseña</h1>
    <p style="margin:0 0 16px;line-height:1.6">${escaparHtml(saludo)}</p>
    <p style="margin:0 0 24px;line-height:1.6">Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
    <p style="margin:0 0 24px">
      <a href="${escaparHtml(enlace)}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">Elegir nueva contraseña</a>
    </p>
    <p style="margin:0 0 16px;line-height:1.6;font-size:14px;color:#52607a">El enlace es válido durante ${minutos} minutos y solo puede usarse una vez.</p>
    <p style="margin:0 0 24px;line-height:1.6;font-size:14px;color:#52607a">Si el botón no funciona, copia esta dirección en tu navegador:<br><span style="word-break:break-all;color:#6366f1">${escaparHtml(enlace)}</span></p>
    <hr style="border:none;border-top:1px solid #e3e6ea;margin:24px 0">
    <p style="margin:0;line-height:1.6;font-size:13px;color:#7a869a">Si no solicitaste este cambio, puedes ignorar este mensaje: tu contraseña no cambiará.</p>
  </div>
</body></html>`;

    return { asunto: 'Restablece tu contraseña de EntryTech', texto, html };
};
