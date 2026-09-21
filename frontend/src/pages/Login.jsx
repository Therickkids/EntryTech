import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Shield, Zap, Smartphone, Lock } from 'lucide-react';
import api, { mensajeDeError } from '../services/api';
import { guardarSesion } from '../services/session';

/**
 * Fondo de partículas.
 *
 * Correcciones respecto a la versión anterior:
 * - El lienzo se dimensionaba con window.innerWidth pero sin tener en cuenta
 *   devicePixelRatio, de modo que en pantallas retina se veía borroso.
 * - El número de partículas era fijo (60) y el cálculo de enlaces es O(n²) en
 *   cada fotograma: 1.770 comparaciones a 60 fps agotaban la batería en móviles.
 *   Ahora la cantidad depende del ancho de pantalla.
 * - No se respetaba prefers-reduced-motion.
 * - El listener de resize no estaba limitado, así que al girar el dispositivo
 *   se reconstruía el lienzo decenas de veces.
 */
const ParticlesCanvas = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const reduceMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMovimiento) return undefined;

        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        const ctx = canvas.getContext('2d');
        let animationId;
        let temporizadorResize;
        let particulas = [];

        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        const construir = () => {
            const ancho = window.innerWidth;
            const alto = window.innerHeight;

            canvas.width = ancho * dpr;
            canvas.height = alto * dpr;
            canvas.style.width = `${ancho}px`;
            canvas.style.height = `${alto}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Densidad proporcional al área, con topes razonables.
            const cantidad = Math.max(18, Math.min(60, Math.round((ancho * alto) / 28000)));

            particulas = Array.from({ length: cantidad }, () => ({
                x: Math.random() * ancho,
                y: Math.random() * alto,
                radius: Math.random() * 2 + 0.5,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                opacity: Math.random() * 0.5 + 0.1,
                color: Math.random() > 0.5 ? '99,102,241' : '14,165,233',
            }));
        };

        construir();

        const dibujar = () => {
            const ancho = window.innerWidth;
            const alto = window.innerHeight;
            ctx.clearRect(0, 0, ancho, alto);

            particulas.forEach((p) => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
                ctx.fill();
            });

            for (let i = 0; i < particulas.length; i += 1) {
                for (let j = i + 1; j < particulas.length; j += 1) {
                    const dx = particulas[i].x - particulas[j].x;
                    const dy = particulas[i].y - particulas[j].y;
                    // Se compara el cuadrado de la distancia para evitar una
                    // raíz cuadrada por cada par en cada fotograma.
                    const dist2 = dx * dx + dy * dy;
                    if (dist2 < 14400) {
                        const dist = Math.sqrt(dist2);
                        ctx.beginPath();
                        ctx.moveTo(particulas[i].x, particulas[i].y);
                        ctx.lineTo(particulas[j].x, particulas[j].y);
                        ctx.strokeStyle = `rgba(99,102,241,${0.08 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            particulas.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > ancho) p.vx *= -1;
                if (p.y < 0 || p.y > alto) p.vy *= -1;
            });

            animationId = requestAnimationFrame(dibujar);
        };

        dibujar();

        const alRedimensionar = () => {
            clearTimeout(temporizadorResize);
            temporizadorResize = setTimeout(construir, 200);
        };

        window.addEventListener('resize', alRedimensionar);

        return () => {
            cancelAnimationFrame(animationId);
            clearTimeout(temporizadorResize);
            window.removeEventListener('resize', alRedimensionar);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                pointerEvents: 'none',
            }}
        />
    );
};

const caracteristicas = [
    {
        icono: <Shield size={26} />,
        color: 'var(--primary-color)',
        titulo: 'Seguridad verificable',
        texto: 'Códigos QR dinámicos que se renuevan en cada acceso.',
    },
    {
        icono: <Zap size={26} />,
        color: 'var(--secondary)',
        titulo: 'Registro inmediato',
        texto: 'Entrada y salida con marca de tiempo del servidor.',
    },
    {
        icono: <Smartphone size={26} />,
        color: 'var(--success)',
        titulo: 'Carnet en el móvil',
        texto: 'Sin tarjetas físicas ni costos de reposición.',
    },
];

const Login = () => {
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isWakingUp, setIsWakingUp] = useState(false);
    const [showLock, setShowLock] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Aviso cuando el interceptor redirige aquí por token caducado.
    const sesionExpirada = searchParams.get('sesion') === 'expirada';

    useEffect(() => {
        if (!loading) {
            setIsWakingUp(false);
            return undefined;
        }
        // El plan gratuito de Render duerme la instancia: el primer login puede
        // tardar hasta 50 segundos y conviene explicárselo al usuario.
        const timer = setTimeout(() => setIsWakingUp(true), 4000);
        return () => clearTimeout(timer);
    }, [loading]);

    useEffect(() => {
        const lockTimer = setTimeout(() => setShowLock(true), 3500);
        return () => clearTimeout(lockTimer);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/login', { correo: correo.trim(), password });
            guardarSesion(res.data.token, res.data.usuario);
            navigate(res.data.usuario.rol === 'admin' ? '/dashboard' : '/carnet', { replace: true });
        } catch (err) {
            setError(mensajeDeError(err, 'Error al iniciar sesión.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container" style={{ position: 'relative' }}>
            <ParticlesCanvas />

            {/*
              El contenedor ya no fija flexDirection ni anchos en línea.
              Esos estilos anulaban las media queries y eran la causa de que el
              inicio de sesión se viera en dos columnas comprimidas en el móvil.
            */}
            <div className="auth-wrapper" style={{ position: 'relative', zIndex: 1 }}>
                <div className="auth-intro animate-fade-in">
                    <div style={{ minHeight: '70px', display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                        {!showLock ? (
                            <h1
                                className="animate-fade-in"
                                onMouseLeave={() => setShowLock(true)}
                                style={{
                                    margin: 0,
                                    fontFamily: 'var(--font-heading)',
                                    background: 'linear-gradient(135deg, #fff, #818cf8)',
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    lineHeight: 1,
                                    cursor: 'default',
                                }}
                            >
                                EntryTech
                            </h1>
                        ) : (
                            <div
                                className="animate-scale-in"
                                onMouseEnter={() => setShowLock(false)}
                                aria-hidden="true"
                                style={{
                                    color: 'var(--primary-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    padding: '1rem',
                                    borderRadius: '24px',
                                    border: '1px solid rgba(99, 102, 241, 0.3)',
                                    cursor: 'pointer',
                                }}
                            >
                                <Lock size={40} strokeWidth={2.5} />
                            </div>
                        )}
                    </div>

                    <h2>El futuro del acceso inteligente.</h2>
                    <p>
                        Plataforma de control de acceso que gestiona identidades digitales y
                        registra entradas y salidas en tiempo real, sin carnets físicos.
                    </p>

                    {/* El espaciado vive en la hoja de estilos: en línea anularía
                        las media queries, que es justo el error que se corrigió. */}
                    <div className="intro-lista">
                        {caracteristicas.map((c) => (
                            <div className="intro-feature" key={c.titulo}>
                                <div style={{ color: c.color, flexShrink: 0 }}>{c.icono}</div>
                                <div style={{ minWidth: 0 }}>
                                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>
                                        {c.titulo}
                                    </h4>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.texto}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="auth-card animate-scale-in">
                    <h2 style={{ marginBottom: '0.25rem' }}>EntryTech</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        Sistema Inteligente de Acceso
                    </p>

                    {sesionExpirada && !error && (
                        <div className="alerta alerta-info" role="status">
                            Tu sesión expiró. Vuelve a iniciar sesión.
                        </div>
                    )}

                    {error && (
                        <div className="alerta alerta-error" role="alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} noValidate>
                        <div className="form-group">
                            <label className="form-label" htmlFor="login-correo">Correo electrónico</label>
                            <input
                                id="login-correo"
                                name="correo"
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
                            <label className="form-label" htmlFor="login-password">Contraseña</label>
                            <input
                                id="login-password"
                                name="password"
                                type="password"
                                className="form-control"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <div style={{ textAlign: 'right' }}>
                                <Link to="/reset-password" style={{ color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: 600 }}>
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-block click-effect" disabled={loading}>
                            {loading ? (isWakingUp ? 'Despertando servidor...' : 'Ingresando...') : 'Iniciar sesión'}
                        </button>
                    </form>

                    <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
                        ¿No tienes cuenta?{' '}
                        <Link to="/register" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
                            Crear cuenta
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
