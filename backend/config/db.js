import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const poolConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT, 10) || 5432,
    };

/**
 * Detección de entorno local. Antes solo se miraba DB_HOST, así que al usar
 * DATABASE_URL apuntando a localhost se intentaba SSL contra un Postgres local
 * sin TLS y la conexión fallaba.
 */
const cadena = process.env.DATABASE_URL || '';
const host = process.env.DB_HOST || '';
const esLocal =
    /(^|@|\/\/)(localhost|127\.0\.0\.1)/.test(cadena) ||
    host === 'localhost' ||
    host === '127.0.0.1';

const pool = new Pool({
    ...poolConfig,
    ...(!esLocal && { ssl: { rejectUnauthorized: false } }),
    // El plan gratuito de Supabase limita las conexiones simultáneas; sin tope
    // el pool abría hasta 10 y agotaba la cuota con varias instancias.
    max: parseInt(process.env.DB_POOL_MAX, 10) || 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
    // Un cliente inactivo que muere no debe tumbar el proceso.
    console.error('❌ Error en el pool de PostgreSQL:', err.message);
});

export default pool;
