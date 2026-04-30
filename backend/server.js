import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import pool from './config/db.js'; // Importar la conexión

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Rutas base
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.send('API de EntryTech corriendo sin problemas.');
});

// Probar conexión a la base de datos al arrancar
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ ERROR AL CONECTAR A LA BASE DE DATOS:', err.message);
    } else {
        console.log('✅ CONEXIÓN EXITOSA A LA BASE DE DATOS (Supabase)');
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor levantado en el puerto ${PORT}`);
});

