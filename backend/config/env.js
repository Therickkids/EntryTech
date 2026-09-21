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
};

export default config;
