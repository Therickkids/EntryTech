import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import api from './services/api';
import { obtenerToken, obtenerUsuario } from './services/session';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Carnet from './pages/Carnet';
import KioskSimulator from './pages/KioskSimulator';
import Usuarios from './pages/Usuarios';
import Manual from './pages/Manual';

const PrivateRoute = ({ children }) => (
    obtenerToken() ? children : <Navigate to="/login" replace />
);

const AdminRoute = ({ children }) => {
    if (!obtenerToken()) return <Navigate to="/login" replace />;
    return obtenerUsuario()?.rol === 'admin' ? children : <Navigate to="/carnet" replace />;
};

/** Envuelve una pantalla privada con la barra de navegación. */
const ConNavbar = ({ children }) => (
    <>
        <Navbar />
        {children}
    </>
);

/*
  Página 404 real. Antes cualquier ruta desconocida redirigía a /login, de modo
  que un usuario con la sesión abierta que escribía mal la dirección era
  expulsado a la pantalla de acceso sin ninguna explicación.
*/
const NoEncontrada = () => (
    <div className="auth-container">
        <div className="auth-card">
            <h2 style={{ marginBottom: '0.5rem' }}>Página no encontrada</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--paso-3)' }}>
                La dirección que buscas no existe en EntryTech.
            </p>
            <Link className="btn btn-primary btn-block" to={obtenerToken() ? '/carnet' : '/login'}>
                Volver al inicio
            </Link>
        </div>
    </div>
);

/** Redirección inicial según el rol de quien tiene la sesión abierta. */
const Inicio = () => {
    if (!obtenerToken()) return <Navigate to="/login" replace />;
    return <Navigate to={obtenerUsuario()?.rol === 'admin' ? '/dashboard' : '/carnet'} replace />;
};

function App() {
    useEffect(() => {
        // Despierta la instancia gratuita de Render mientras el usuario escribe
        // sus credenciales, para que el primer login no tarde 50 segundos.
        api.get('/ping').catch(() => {});
    }, []);

    return (
        <ErrorBoundary>
            <Router>
                <div className="app-container">
                    <Routes>
                        <Route path="/" element={<Inicio />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/reset-password" element={<ForgotPassword />} />

                        <Route path="/dashboard" element={<AdminRoute><ConNavbar><Dashboard /></ConNavbar></AdminRoute>} />
                        <Route path="/usuarios" element={<AdminRoute><ConNavbar><Usuarios /></ConNavbar></AdminRoute>} />

                        <Route path="/carnet" element={<PrivateRoute><ConNavbar><Carnet /></ConNavbar></PrivateRoute>} />
                        <Route path="/simulador" element={<PrivateRoute><ConNavbar><KioskSimulator /></ConNavbar></PrivateRoute>} />
                        <Route path="/manual" element={<PrivateRoute><ConNavbar><Manual /></ConNavbar></PrivateRoute>} />

                        <Route path="*" element={<NoEncontrada />} />
                    </Routes>
                </div>
            </Router>
        </ErrorBoundary>
    );
}

export default App;
