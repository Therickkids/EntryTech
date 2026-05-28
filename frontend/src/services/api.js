import axios from 'axios';

// URL del backend en Render (PRODUCCIÓN) o local
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://entrytech-backend.onrender.com/api',
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
