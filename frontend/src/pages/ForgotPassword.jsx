import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import api, { mensajeDeError } from '../services/api';

/**
 * Paso 1 de la recuperación: pedir el enlace.
 *
 * La versión anterior cambiaba la contraseña aquí mismo, presentando correo y
 * cédula. En Colombia la cédula no es un dato secreto —aparece en contratos,
 * formularios y filtraciones—, de modo que bastaban dos datos públicos para
 * apoderarse de una cuenta. Ahora el formulario solo envía un enlace temporal
 * al correo registrado: la prueba de identidad pasa a ser el acceso al buzón.
 */
const ForgotPassword = () => {
    const [correo, setCorreo] = useState('');
    const [enviado, setEnviado] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await api.post('/recuperar', { correo: correo.trim() });
            setEnviado(true);
        } catch (err) {
            setError(mensajeDeError(err, 'No se pudo procesar la solicitud.'));
        } finally {
            setLoading(false);
        }
    };

    if (enviado) {
        return (
            <div className="auth-container">
                <div className="auth-card animate-scale-in">
                    <div style={{ color: 'var(--success)', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        <MailCheck size={40} />
                    </div>
                    <h2 style={{ marginBottom: '0.75rem' }}>Revisa tu correo</h2>
                    <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1rem' }}>
                        Si ese correo corresponde a una cuenta, te enviamos un enlace para
                        restablecer la contraseña. Revisa también la carpeta de no deseados.
                    </p>
                    <p className="form-hint" style={{ marginBottom: 'var(--paso-3)' }}>
                        El enlace es válido durante una hora y solo puede usarse una vez.
                    </p>
                    <Link className="btn btn-secondary btn-block" to="/login">
                        Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card animate-scale-in">
                <h2 style={{ marginBottom: '0.5rem' }}>Recuperar contraseña</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--paso-3)', fontSize: '0.9rem' }}>
                    Te enviaremos un enlace a tu correo para que elijas una nueva.
                </p>

                {error && <div className="alerta alerta-error" role="alert">{error}</div>}

                <form onSubmit={handleSubmit} noValidate>
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

                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? 'Enviando...' : 'Enviar enlace'}
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
