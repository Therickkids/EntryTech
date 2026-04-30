import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '5mb' })); // Soporta imágenes en Base64

// Rutas base
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.send('API de EntryTech corriendo sin problemas.');
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor levantado en el puerto ${PORT}`);
});
