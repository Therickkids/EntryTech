import axios from 'axios';

// Al usar un proxy o subirlo a internet, usamos la ruta relativa
const api = axios.create({
    baseURL: '/api',
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
