import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Validación de arranque ("fail fast").
 * Antes, si JWT_SECRET no estaba definido el sistema caía silenciosamente a la
 * clave literal 'super_secret', lo que permitía a cualquiera firmar tokens de
 * administrador válidos. Ahora el servidor se niega a arrancar sin secreto.
 */
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
    const mensaje = 'JWT_SECRET no está definido o tiene menos de 32 caracteres.';
    if (isProduction) {
        console.error(`❌ ${mensaje} El servidor no puede arrancar en producción.`);
        process.exit(1);
    }
    console.warn(`⚠️  ${mensaje} Se usará un secreto temporal SOLO para desarrollo.`);
}

const config = {
    isProduction,
    port: parseInt(process.env.PORT, 10) || 5000,
    jwtSecret: JWT_SECRET || 'dev-only-secret-no-usar-en-produccion-1234567890',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

    // Orígenes autorizados para CORS. Antes se aceptaba cualquier origen.
    corsOrigins: (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),

    // Clave opcional del kiosco. Si se define, POST /api/acceso deja de ser público.
    kioskApiKey: process.env.KIOSK_API_KEY || null,

    // Tamaño máximo del cuerpo JSON (la foto viaja en Base64).
    jsonLimit: process.env.JSON_LIMIT || '3mb',

    /*
      Clave de api.nasa.gov para el fondo diario. DEMO_KEY funciona, pero su
      límite es de 30 peticiones por hora y 50 por día para toda la dirección
      IP, insuficiente para un sitio publicado. La clave propia es gratuita y
      se obtiene al instante en https://api.nasa.gov
    */
    nasaApiKey: process.env.NASA_API_KEY || 'DEMO_KEY',

    /*
      Envío de correo para la recuperación de contraseña (Brevo).
      Sin estos valores el sistema arranca igual, pero la recuperación queda
      deshabilitada y lo indica de forma explícita, en lugar de fingir que el
      correo salió.
    */
    brevoApiKey: process.env.BREVO_API_KEY || '',
    mailFromEmail: process.env.MAIL_FROM_EMAIL || '',
    mailFromNombre: process.env.MAIL_FROM_NOMBRE || 'EntryTech',

    // Dirección pública del frontend: es la base del enlace del correo.
    appUrl: process.env.APP_URL || 'https://entry-tech.vercel.app',
};

export default config;
