import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const Login = () => {
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/login', { correo, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('usuario', JSON.stringify(res.data.usuario));
            navigate(res.data.usuario.rol === 'admin' ? '/dashboard' : '/carnet');
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="card auth-card">
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h2 className="typewriter-text">
                        EntryTech
                    </h2>
                </div>
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    Sistema Inteligente de Acceso
                </p>
                {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
                
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label">Correo Electrónico</label>
                        <input 
                            type="email" 
                            className="form-control" 
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group" style={{ position: 'relative' }}>
                        <label className="form-label">Contraseña</label>
                        <input 
                            type="password" 
                            className="form-control" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                            <Link to="/reset-password" style={{ color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none' }}>
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <p style={{marginTop: '0.5rem', textAlign: 'center', fontSize: '0.9rem'}}>
                    ¿No tienes cuenta?{' '}
                    <Link to="/register" style={{ color: 'var(--primary-color)', fontWeight: '600' }}>
                        Crear Cuenta
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
