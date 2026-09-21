import express from 'express';
import cors from 'cors';
import config from './config/env.js';
import apiRoutes from './routes/api.js';
import pool from './config/db.js';

const app = express();

// Render y Vercel actúan como proxy inverso: sin esto req.ip siempre sería la IP
// del proxy y el limitador de peticiones agruparía a todos los usuarios.
app.set('trust proxy', 1);
app.disable('x-powered-by');

/**
 * Cabeceras de seguridad básicas. Se escriben a mano en lugar de usar helmet
 * para no alterar package-lock.json (el despliegue usa `npm ci`).
 */
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    if (config.isProduction) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

/**
 * CORS restringido. Antes se usaba `cors()` sin argumentos, que responde
 * Access-Control-Allow-Origin: * y deja la API abierta a cualquier sitio web.
 * Si CORS_ORIGINS está vacío se mantiene el comportamiento permisivo solo en
 * desarrollo, para no romper el flujo local del equipo.
 */
const corsOptions = {
    origin(origin, callback) {
        // Peticiones sin origen: curl, apps móviles, health checks de Render.
        if (!origin) return callback(null, true);

        if (config.corsOrigins.length === 0) {
            if (config.isProduction) {
                return callback(new Error('CORS_ORIGINS no está configurado'));
            }
            return callback(null, true);
        }

        if (config.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origen no autorizado: ${origin}`));
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Kiosk-Key'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: config.jsonLimit }));

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.json({ servicio: 'EntryTech API', estado: 'operativo' });
});

// 404 explícito: antes una ruta inexistente devolvía el HTML por defecto de Express.
app.use((req, res) => {
    res.status(404).json({ mensaje: 'Recurso no encontrado.' });
});

/**
 * Manejador de errores centralizado. Nunca devuelve el stack ni el mensaje
 * interno al cliente: el controlador de registro antes filtraba `error.message`,
 * lo que exponía nombres de tablas y restricciones de la base de datos.
 */
// eslint-disable-next-line no-unused-vars -- Express identifica el handler por su aridad de 4.
app.use((err, req, res, next) => {
    if (err && /CORS|Origen no autorizado/.test(err.message || '')) {
        return res.status(403).json({ mensaje: 'Origen no autorizado.' });
    }
    if (err && err.type === 'entity.too.large') {
        return res.status(413).json({ mensaje: 'El contenido enviado es demasiado grande.' });
    }
    console.error('❌ Error no controlado:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor.' });
});

pool.query('SELECT NOW()')
    .then(() => console.log('✅ Conexión a la base de datos establecida.'))
    .catch((err) => console.error('❌ No se pudo conectar a la base de datos:', err.message));

const server = app.listen(config.port, () => {
    console.log(`🚀 EntryTech API escuchando en el puerto ${config.port}`);
});

// Cierre ordenado: Render envía SIGTERM en cada despliegue. Sin esto las
// conexiones abiertas a PostgreSQL quedaban colgadas hasta agotar el pool.
const cerrar = (senal) => {
    console.log(`Recibida ${senal}, cerrando servidor...`);
    server.close(() => {
        pool.end().finally(() => process.exit(0));
    });
};

process.on('SIGTERM', () => cerrar('SIGTERM'));
process.on('SIGINT', () => cerrar('SIGINT'));

export default app;
