import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const Register = () => {
    const [cedula, setCedula] = useState('');
    const [nombre, setNombre] = useState('');
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isWakingUp, setIsWakingUp] = useState(false);
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

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.post('/register', { cedula, nombre, correo, password });
            // Registro exitoso, redirigir al login
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al registrar usuario');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="card auth-card animate-scale-in">
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: '900', fontFamily: 'var(--font-heading)', letterSpacing: '-0.05em', background: 'linear-gradient(135deg, #e0e7ff, #818cf8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.25rem' }}>EntryTech</div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Crear Cuenta Nueva</p>
                </div>
                {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleRegister}>
                    <div className="form-group">
                        <label className="form-label">Cédula (Documento de Identidad)</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Ej: 1234567890"
                            value={cedula}
                            onChange={(e) => setCedula(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Nombre Completo</label>
                        <input
                            type="text"
                            className="form-control"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            required
                        />
                    </div>
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
                    <div className="form-group">
                        <label className="form-label">Contraseña</label>
                        <input
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block click-effect" disabled={loading}>
                        {loading ? (isWakingUp ? 'Despertando servidor...' : 'Registrando...') : 'Crear Cuenta'}
                    </button>
                </form>

                <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: '600' }}>
                        Iniciar Sesión
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
