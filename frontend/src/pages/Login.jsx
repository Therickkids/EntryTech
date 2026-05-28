import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Zap, Smartphone, Lock } from 'lucide-react';
import api from '../services/api';

const Login = () => {
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isWakingUp, setIsWakingUp] = useState(false);
    const [showLock, setShowLock] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        let timer;
        if (loading) {
            timer = setTimeout(() => {
                setIsWakingUp(true);
            }, 4000); // Mostrar mensaje después de 4 segundos
        } else {
            setIsWakingUp(false);
        }
        return () => clearTimeout(timer);
    }, [loading]);

    useEffect(() => {
        // Animación de texto a candado
        const lockTimer = setTimeout(() => {
            setShowLock(true);
        }, 3500);
        return () => clearTimeout(lockTimer);
    }, []);

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
            <div className="auth-wrapper">
                {/* Lado Izquierdo: Introducción / Landing */}
                <div className="auth-intro animate-fade-in">
                    <div style={{ height: '70px', display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                        {!showLock ? (
                            <h1 className="animate-fade-in" style={{ margin: 0, fontSize: '3.5rem', fontFamily: 'var(--font-heading)', background: 'linear-gradient(135deg, #fff, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: '1' }}>
                                EntryTech
                            </h1>
                        ) : (
                            <div className="animate-scale-in" style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center', background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '24px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                                <Lock size={48} strokeWidth={2.5} />
                            </div>
                        )}
                    </div>
                    <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '1rem', lineHeight: '1.2' }}>El futuro del acceso inteligente.</h2>
                    <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)' }}>Una plataforma de seguridad de próxima generación diseñada para gestionar identidades y proteger tus espacios con tecnología sin contacto y criptografía dinámica.</p>
                    
                    <div className="intro-features" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                        <div className="intro-feature">
                            <div style={{ color: 'var(--primary-color)' }}>
                                <Shield size={28} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>Seguridad Infranqueable</h4>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Códigos QR dinámicos de un solo uso.</span>
                            </div>
                        </div>
                        <div className="intro-feature">
                            <div style={{ color: 'var(--secondary)' }}>
                                <Zap size={28} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>Acceso Ultrarrápido</h4>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sincronización en tiempo real sin demoras.</span>
                            </div>
                        </div>
                        <div className="intro-feature">
                            <div style={{ color: 'var(--success)' }}>
                                <Smartphone size={28} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>Integración NFC</h4>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Convierte tu dispositivo en una llave maestra.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lado Derecho: Formulario de Login */}
                <div className="auth-card animate-scale-in">
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <h2 className="typewriter-text">
                            EntryTech
                        </h2>
                    </div>
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        Sistema Inteligente de Acceso
                    </p>
                    {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center', background: 'var(--danger-bg)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
                    
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
                                <Link to="/reset-password" style={{ color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none', transition: 'color 0.2s' }} className="hover-glow">
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary btn-block click-effect" disabled={loading}>
                            {loading ? (isWakingUp ? 'Despertando servidor...' : 'Ingresando...') : 'Iniciar Sesión'}
                        </button>
                    </form>

                    <p style={{marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem'}}>
                        ¿No tienes cuenta?{' '}
                        <Link to="/register" style={{ color: 'var(--primary-color)', fontWeight: '600', textDecoration: 'none' }} className="hover-glow">
                            Crear Cuenta
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
