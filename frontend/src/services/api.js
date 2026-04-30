import axios from 'axios';

// URL del backend en Render (PRODUCCIÓN)
const api = axios.create({
    baseURL: 'https://entrytech-backend.onrender.com/api',
});

// Interceptor para agregar token a peticiones
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
