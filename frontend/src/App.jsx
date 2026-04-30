import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Carnet from './pages/Carnet';
import KioskSimulator from './pages/KioskSimulator';
import Usuarios from './pages/Usuarios';
import Navbar from './components/Navbar';

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!token) return <Navigate to="/login" />;
    return usuario.rol === 'admin' ? children : <Navigate to="/carnet" />;
};

function App() {
    return (
        <Router>
            <div className="app-container">
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/reset-password" element={<ForgotPassword />} />
                    
                    {/* Rutas Privadas Admin */}
                    <Route path="/dashboard" element={
                        <AdminRoute>
                            <Navbar />
                            <Dashboard />
                        </AdminRoute>
                    } />
                    <Route path="/usuarios" element={
                        <AdminRoute>
                            <Navbar />
                            <Usuarios />
                        </AdminRoute>
                    } />

                    {/* Rutas Privadas Generales */}
                    <Route path="/carnet" element={
                        <PrivateRoute>
                            <Navbar />
                            <Carnet />
                        </PrivateRoute>
                    } />
                    <Route path="/simulador" element={
                        <PrivateRoute>
                            <Navbar />
                            <KioskSimulator />
                        </PrivateRoute>
                    } />

                    <Route path="*" element={<Navigate to="/login" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
