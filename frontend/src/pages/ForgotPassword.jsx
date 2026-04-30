import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
    const [correo, setCorreo] = useState('');
    const [cedula, setCedula] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await api.post('/reset-password', { correo, cedula, nuevaPassword });
            setSuccess(res.data.mensaje);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.mensaje || 'Error al restablecer contraseña');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="card auth-card">
                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
                    Recuperar Contraseña
                </h2>
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    Ingresa tus datos para crear una nueva contraseña
                </p>
                {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
                {success && <div style={{ color: '#059669', marginBottom: '1rem', textAlign: 'center', fontWeight: 'bold' }}>{success}</div>}
                
                <form onSubmit={handleReset}>
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
                        <label className="form-label">Cédula de Identidad</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            value={cedula}
                            onChange={(e) => setCedula(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Nueva Contraseña</label>
                        <input 
                            type="password" 
                            className="form-control" 
                            value={nuevaPassword}
                            onChange={(e) => setNuevaPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? 'Procesando...' : 'Cambiar Contraseña'}
                    </button>
                </form>

                <p style={{marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem'}}>
                    <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: '600' }}>
                        Volver al inicio de sesión
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;
