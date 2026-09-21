import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { mensajeDeError } from '../services/api';

const PASSWORD_MIN = 8;

/**
 * Validación en cliente equivalente a la del servidor.
 * Antes el formulario solo usaba `required`, de modo que cualquier error de
 * formato se descubría después del viaje al servidor y se mostraba como un
 * mensaje genérico sin indicar qué campo estaba mal.
 */
const validarCampos = ({ cedula, nombre, correo, password, confirmacion, autoriza }) => {
    const errores = {};

    if (!/^\d{5,20}$/.test(cedula.trim())) {
        errores.cedula = 'La cédula debe tener entre 5 y 20 dígitos, sin puntos ni espacios.';
    }
    if (nombre.trim().length < 3) {
        errores.nombre = 'Escribe tu nombre completo (mínimo 3 caracteres).';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo.trim())) {
        errores.correo = 'Escribe un correo electrónico válido.';
    }
    if (password.length < PASSWORD_MIN) {
        errores.password = `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
    } else if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
        errores.password = 'La contraseña debe combinar letras y números.';
    }
    if (password !== confirmacion) {
        errores.confirmacion = 'Las contraseñas no coinciden.';
    }
    if (!autoriza) {
        errores.autoriza = 'Debes autorizar el tratamiento de tus datos personales.';
    }

    return errores;
};

const Register = () => {
    const [form, setForm] = useState({
        cedula: '',
        nombre: '',
        correo: '',
        password: '',
        confirmacion: '',
        autoriza: false,
    });
    const [errores, setErrores] = useState({});
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isWakingUp, setIsWakingUp] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading) {
            setIsWakingUp(false);
            return undefined;
        }
        const timer = setTimeout(() => setIsWakingUp(true), 4000);
        return () => clearTimeout(timer);
    }, [loading]);

    const actualizar = (campo) => (e) => {
        const valor = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm((prev) => ({ ...prev, [campo]: valor }));
        setErrores((prev) => ({ ...prev, [campo]: undefined }));
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(null);

        const nuevosErrores = validarCampos(form);
        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            return;
        }

        setLoading(true);
        try {
            await api.post('/register', {
                cedula: form.cedula.trim(),
                nombre: form.nombre.trim(),
                correo: form.correo.trim(),
                password: form.password,
            });
            navigate('/login', { replace: true });
        } catch (err) {
            setError(mensajeDeError(err, 'Error al registrar el usuario.'));
        } finally {
            setLoading(false);
        }
    };

    const campo = (id, etiqueta, props) => (
        <div className="form-group">
            <label className="form-label" htmlFor={id}>{etiqueta}</label>
            <input
                id={id}
                className="form-control"
                aria-invalid={errores[props.name] ? 'true' : 'false'}
                aria-describedby={errores[props.name] ? `${id}-error` : undefined}
                {...props}
            />
            {errores[props.name] && (
                <span className="form-error" id={`${id}-error`} role="alert">
                    {errores[props.name]}
                </span>
            )}
        </div>
    );

    return (
        <div className="auth-container">
            <div className="auth-card animate-scale-in">
                <h2 style={{ marginBottom: '0.25rem' }}>EntryTech</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Crear cuenta nueva
                </p>

                {error && (
                    <div className="alerta alerta-error" role="alert">{error}</div>
                )}

                <form onSubmit={handleRegister} noValidate>
                    {campo('reg-cedula', 'Cédula (documento de identidad)', {
                        name: 'cedula',
                        type: 'text',
                        inputMode: 'numeric',
                        autoComplete: 'off',
                        placeholder: 'Ej: 1234567890',
                        value: form.cedula,
                        onChange: actualizar('cedula'),
                    })}

                    {campo('reg-nombre', 'Nombre completo', {
                        name: 'nombre',
                        type: 'text',
                        autoComplete: 'name',
                        value: form.nombre,
                        onChange: actualizar('nombre'),
                    })}

                    {campo('reg-correo', 'Correo electrónico', {
                        name: 'correo',
                        type: 'email',
                        inputMode: 'email',
                        autoComplete: 'email',
                        value: form.correo,
                        onChange: actualizar('correo'),
                    })}

                    {campo('reg-password', 'Contraseña', {
                        name: 'password',
                        type: 'password',
                        autoComplete: 'new-password',
                        value: form.password,
                        onChange: actualizar('password'),
                    })}

                    {campo('reg-confirmacion', 'Confirmar contraseña', {
                        name: 'confirmacion',
                        type: 'password',
                        autoComplete: 'new-password',
                        value: form.confirmacion,
                        onChange: actualizar('confirmacion'),
                    })}

                    <p className="form-hint" style={{ textAlign: 'left', marginTop: '-0.5rem', marginBottom: '1.25rem' }}>
                        Mínimo {PASSWORD_MIN} caracteres, combinando letras y números.
                    </p>

                    {/*
                      Casilla de autorización de datos personales.
                      El Decreto 1377 de 2013, que reglamenta la Ley 1581 de 2012,
                      exige consentimiento previo y expreso antes de recolectar
                      datos como la cédula o la fotografía. El propio documento
                      del proyecto marcaba este punto como pendiente.
                    */}
                    <div className="form-group">
                        <label className="form-check" htmlFor="reg-autoriza">
                            <input
                                id="reg-autoriza"
                                name="autoriza"
                                type="checkbox"
                                checked={form.autoriza}
                                onChange={actualizar('autoriza')}
                                aria-invalid={errores.autoriza ? 'true' : 'false'}
                            />
                            <span>
                                Autorizo el tratamiento de mis datos personales (cédula, nombre,
                                correo, fotografía y registros de acceso) con la finalidad de
                                controlar el ingreso y la salida de las instalaciones, conforme a
                                la Ley 1581 de 2012 y el Decreto 1377 de 2013.
                            </span>
                        </label>
                        {errores.autoriza && (
                            <span className="form-error" role="alert">{errores.autoriza}</span>
                        )}
                    </div>

                    <button type="submit" className="btn btn-primary btn-block click-effect" disabled={loading}>
                        {loading ? (isWakingUp ? 'Despertando servidor...' : 'Registrando...') : 'Crear cuenta'}
                    </button>
                </form>

                <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
                        Iniciar sesión
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
