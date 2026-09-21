import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { mensajeDeError } from '../services/api';

const PASSWORD_MIN = 8;

const ForgotPassword = () => {
    const [correo, setCorreo] = useState('');
    const [cedula, setCedula] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [confirmacion, setConfirmacion] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleReset = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // Validación previa: antes se enviaba cualquier contraseña, incluida una
        // de un solo carácter, y no existía campo de confirmación, así que un
        // error de tecleo dejaba al usuario fuera de su propia cuenta.
        if (nuevaPassword.length < PASSWORD_MIN || !/[a-zA-Z]/.test(nuevaPassword) || !/\d/.test(nuevaPassword)) {
            setError(`La contraseña debe tener al menos ${PASSWORD_MIN} caracteres y combinar letras y números.`);
            return;
        }
        if (nuevaPassword !== confirmacion) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/reset-password', {
                correo: correo.trim(),
                cedula: cedula.trim(),
                nuevaPassword,
            });
            setSuccess(res.data.mensaje);
            setTimeout(() => navigate('/login', { replace: true }), 2500);
        } catch (err) {
            setError(mensajeDeError(err, 'Error al restablecer la contraseña.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 style={{ marginBottom: '0.5rem' }}>Recuperar contraseña</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--paso-3)', fontSize: '0.9rem' }}>
                    Ingresa tus datos para crear una nueva contraseña
                </p>

                {error && <div className="alerta alerta-error" role="alert">{error}</div>}
                {success && <div className="alerta alerta-exito" role="status">{success}</div>}

                <form onSubmit={handleReset} noValidate>
                    <div className="form-group">
                        <label className="form-label" htmlFor="rec-correo">Correo electrónico</label>
                        <input
                            id="rec-correo"
                            type="email"
                            className="form-control"
                            autoComplete="email"
                            inputMode="email"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="rec-cedula">Cédula de identidad</label>
                        <input
                            id="rec-cedula"
                            type="text"
                            className="form-control"
                            inputMode="numeric"
                            value={cedula}
                            onChange={(e) => setCedula(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="rec-password">Nueva contraseña</label>
                        <input
                            id="rec-password"
                            type="password"
                            className="form-control"
                            autoComplete="new-password"
                            value={nuevaPassword}
                            onChange={(e) => setNuevaPassword(e.target.value)}
                            required
                        />
                        <span className="form-hint">Mínimo {PASSWORD_MIN} caracteres, con letras y números.</span>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="rec-confirmacion">Confirmar contraseña</label>
                        <input
                            id="rec-confirmacion"
                            type="password"
                            className="form-control"
                            autoComplete="new-password"
                            value={confirmacion}
                            onChange={(e) => setConfirmacion(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? 'Procesando...' : 'Cambiar contraseña'}
                    </button>
                </form>

                <p style={{ marginTop: 'var(--paso-3)', fontSize: '0.9rem' }}>
                    <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
                        Volver al inicio de sesión
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;
