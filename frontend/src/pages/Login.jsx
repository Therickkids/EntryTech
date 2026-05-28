import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Zap, Smartphone, Lock } from 'lucide-react';
import api from '../services/api';

// ── Componente de partículas flotantes ──
const ParticlesCanvas = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationId;
        let particles = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Crear partículas
        const PARTICLE_COUNT = 60;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 2 + 0.5,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                opacity: Math.random() * 0.5 + 0.1,
                color: Math.random() > 0.5 ? '99,102,241' : '14,165,233', // indigo o cyan
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Dibujar partículas
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
                ctx.fill();
            });

            // Dibujar líneas entre partículas cercanas
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(99,102,241,${0.08 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            // Mover partículas
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            });

            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
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

// ── Componente principal Login ──
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
            }, 4000);
        } else {
            setIsWakingUp(false);
        }
        return () => clearTimeout(timer);
    }, [loading]);

    useEffect(() => {
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
        <div className="auth-container" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Fondo de partículas */}
            <ParticlesCanvas />

            <div className="auth-wrapper" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4rem', width: '100%', maxWidth: '1100px' }}>
                {/* Lado Izquierdo: Introducción / Landing */}
                <div className="auth-intro animate-fade-in" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ height: '70px', display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                        {!showLock ? (
                            <h1
                                className="animate-fade-in"
                                onMouseLeave={() => setShowLock(true)}
                                style={{ margin: 0, fontSize: '3.5rem', fontFamily: 'var(--font-heading)', background: 'linear-gradient(135deg, #fff, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: '1', cursor: 'default' }}
                            >
                                EntryTech
                            </h1>
                        ) : (
                            <div
                                className="animate-scale-in"
                                onMouseEnter={() => setShowLock(false)}
                                style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center', background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '24px', border: '1px solid rgba(99, 102, 241, 0.3)', cursor: 'pointer', transition: 'background 0.3s, transform 0.3s' }}
                            >
                                <Lock size={48} strokeWidth={2.5} />
                            </div>
                        )}
                    </div>
                    <h2 style={{ fontSize: '2.2rem', color: 'var(--text-main)', marginBottom: '1rem', lineHeight: '1.2', fontFamily: 'var(--font-heading)', fontWeight: 900, letterSpacing: '-1px' }}>El futuro del acceso inteligente.</h2>
                    <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: '1.7' }}>Una plataforma de seguridad de próxima generación diseñada para gestionar identidades y proteger tus espacios con tecnología sin contacto y criptografía dinámica.</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
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
                <div className="auth-card animate-scale-in" style={{ flexShrink: 0, width: '420px', maxWidth: '420px' }}>
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
                                <Link to="/reset-password" style={{ color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none', transition: 'color 0.2s' }}>
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
                        <Link to="/register" style={{ color: 'var(--primary-color)', fontWeight: '600', textDecoration: 'none' }}>
                            Crear Cuenta
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
