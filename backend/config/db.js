import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const poolConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT),
    };

const isLocalhost = process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';

const pool = new Pool({
  ...poolConfig,
  ...( !isLocalhost && { ssl: { rejectUnauthorized: false } } )
});

pool.on('connect', () => {
  console.log('📦 Pool de base de datos conectado');
});

pool.on('error', (err) => {
  console.error('❌ ERROR CRÍTICO EN EL POOL:', err.message);
  console.error('Detalles:', err);
});

export default pool;
