import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import api, { mensajeDeError } from '../services/api';

const PASSWORD_MIN = 8;

/**
 * Paso 2 de la recuperación: elegir la nueva contraseña.
 *
 * El token viaja en la dirección del enlace que llega por correo. No se
 * muestra en pantalla ni se guarda: se envía al servidor y se descarta.
 */
const RestablecerPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmacion, setConfirmacion] = useState('');
    const [error, setError] = useState(null);
    const [listo, setListo] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Las mismas reglas que aplica el servidor, para avisar sin esperar.
        if (password.length < PASSWORD_MIN || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
            setError(`La contraseña debe tener al menos ${PASSWORD_MIN} caracteres y combinar letras y números.`);
            return;
        }
        if (password !== confirmacion) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/recuperar/confirmar', { token, nuevaPassword: password });
            setListo(true);
            setTimeout(() => navigate('/login', { replace: true }), 2500);
        } catch (err) {
            setError(mensajeDeError(err, 'No se pudo cambiar la contraseña.'));
        } finally {
            setLoading(false);
        }
    };

    if (listo) {
        return (
            <div className="auth-container">
                <div className="auth-card animate-scale-in">
                    <div style={{ color: 'var(--success)', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <ShieldCheck size={40} />
                    </div>
                    <h2 style={{ marginBottom: '0.75rem' }}>Contraseña actualizada</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        Ya puedes iniciar sesión. Te llevamos allá en un momento.
                    </p>
                    <Link className="btn btn-primary btn-block" to="/login">Iniciar sesión</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card animate-scale-in">
                <h2 style={{ marginBottom: '0.5rem' }}>Nueva contraseña</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--paso-3)', fontSize: '0.9rem' }}>
                    Elige una contraseña que no uses en otros sitios.
                </p>

                {error && <div className="alerta alerta-error" role="alert">{error}</div>}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-group">
                        <label className="form-label" htmlFor="nueva-password">Nueva contraseña</label>
                        <input
                            id="nueva-password"
                            type="password"
                            className="form-control"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <span className="form-hint">
                            Mínimo {PASSWORD_MIN} caracteres, combinando letras y números.
                        </span>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="confirmar-password">Confirmar contraseña</label>
                        <input
                            id="confirmar-password"
                            type="password"
                            className="form-control"
                            autoComplete="new-password"
                            value={confirmacion}
                            onChange={(e) => setConfirmacion(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? 'Guardando...' : 'Cambiar contraseña'}
                    </button>
                </form>

                <p style={{ marginTop: 'var(--paso-3)', fontSize: '0.9rem' }}>
                    <Link to="/recuperar" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
                        Solicitar un enlace nuevo
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default RestablecerPassword;
