import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, QrCode, BookOpen, Menu, X, LogOut, AlertTriangle, CreditCard } from 'lucide-react';
import { obtenerUsuario, cerrarSesion } from '../services/session';
import { cerrarTransicion } from '../services/transicion';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [showConfirmLogout, setShowConfirmLogout] = useState(false);

    const usuario = obtenerUsuario() || {};
    const inicial = usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : '?';

    /*
      El panel lateral se cierra al cambiar de ruta. Antes solo se cerraba si se
      pulsaba un enlace: al navegar con los botones atrás/adelante del navegador
      quedaba abierto y tapaba la pantalla.
    */
    useEffect(() => {
        setIsOpen(false);
        setShowConfirmLogout(false);
    }, [location.pathname]);

    // Cierre con la tecla Escape y bloqueo del scroll de fondo mientras está abierto.
    useEffect(() => {
        if (!isOpen) return undefined;

        const alPulsar = (e) => { if (e.key === 'Escape') setIsOpen(false); };
        window.addEventListener('keydown', alPulsar);

        const overflowPrevio = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', alPulsar);
            document.body.style.overflow = overflowPrevio;
        };
    }, [isOpen]);

    const handleLogout = async () => {
        // El obturador se cierra antes de salir, igual que al entrar: el cambio
        // de ambiente ocurre tapado y la apertura revela ya la pantalla nueva.
        await cerrarTransicion();
        // cerrarSesion() también vacía las cachés de Dashboard y Usuarios, que
        // antes sobrevivían al cierre de sesión dentro del mismo navegador.
        cerrarSesion();
        navigate('/login', { replace: true });
    };

    const navLinks = [
        { path: '/carnet', label: 'Mi carnet', icon: <CreditCard size={18} /> },
        { path: '/simulador', label: 'Simulador', icon: <QrCode size={18} /> },
        { path: '/manual', label: 'Manual de usuario', icon: <BookOpen size={18} /> },
    ];

    if (usuario.rol === 'admin') {
        navLinks.unshift(
            { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
            { path: '/usuarios', label: 'Gestión de usuarios', icon: <Users size={18} /> }
        );
    }

    return (
        <>
            <a className="skip-link" href="#contenido">Saltar al contenido</a>

            <nav className="navbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <button
                        onClick={() => setIsOpen((v) => !v)}
                        className="menu-toggle"
                        aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
                        aria-expanded={isOpen}
                        aria-controls="menu-lateral"
                    >
                        {isOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <span className="navbar-brand" style={{ fontSize: '1rem', fontWeight: 800 }}>EntryTech</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                    <Link
                        to="/carnet"
                        className={`nav-link ${location.pathname === '/carnet' ? 'active' : ''}`}
                        style={{ fontSize: '0.78rem', fontWeight: 700 }}
                    >
                        Mi carnet
                    </Link>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid var(--border)', paddingLeft: '0.6rem', minWidth: 0 }}>
                        <div style={{
                            width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg, var(--primary-color), var(--secondary))',
                            padding: '2px',
                        }}>
                            <div style={{
                                width: '100%', height: '100%', borderRadius: '50%',
                                background: 'rgba(10,10,12,0.9)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, fontSize: '0.72rem',
                                color: 'var(--primary-color)', overflow: 'hidden',
                            }}>
                                {usuario.foto_url
                                    ? <img src={usuario.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : inicial}
                            </div>
                        </div>
                        <span className="nav-name texto-truncado" style={{ fontSize: '0.72rem', fontWeight: 800, maxWidth: '120px' }}>
                            {usuario.nombre?.split(' ')[0]}
                        </span>
                    </div>
                </div>
            </nav>

            <div
                className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
            />

            <aside id="menu-lateral" className={`sidebar ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
                <div className="sidebar-header">
                    <div className="navbar-brand" style={{ fontSize: '1.4rem' }}>EntryTech</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                        Sesión de <strong>{usuario.nombre || 'Usuario'}</strong>
                    </p>
                </div>

                <div className="sidebar-menu">
                    {navLinks.map((link, idx) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`sidebar-link animate-slide-up ${location.pathname === link.path ? 'active' : ''}`}
                            style={{ animationDelay: `${idx * 50}ms` }}
                            // tabIndex evita que el lector de pantalla y el
                            // tabulador entren en un menú que está oculto.
                            tabIndex={isOpen ? 0 : -1}
                        >
                            {link.icon}
                            {link.label}
                        </Link>
                    ))}

                    <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                        {!showConfirmLogout ? (
                            <button
                                onClick={() => setShowConfirmLogout(true)}
                                className="btn-logout-premium"
                                tabIndex={isOpen ? 0 : -1}
                            >
                                <LogOut size={18} />
                                <span>Cerrar sesión</span>
                            </button>
                        ) : (
                            <div className="logout-confirm-box">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.8rem', color: '#f87171' }}>
                                    <AlertTriangle size={16} />
                                    <p style={{ fontSize: '0.78rem', fontWeight: 800, margin: 0 }}>
                                        ¿Seguro que quieres salir?
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={handleLogout} className="btn-logout-confirm">Sí, salir</button>
                                    <button onClick={() => setShowConfirmLogout(false)} className="btn-logout-cancel">No</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ marginTop: 'var(--paso-3)', textAlign: 'center' }}>
                    <span style={{
                        display: 'inline-block', padding: '0.2rem 0.7rem', borderRadius: '20px',
                        border: '1px solid rgba(99,102,241,0.3)', color: 'var(--primary-color)',
                        fontWeight: 700, fontSize: '0.65rem', background: 'rgba(99,102,241,0.08)',
                    }}>
                        v3.1
                    </span>
                </div>
            </aside>
        </>
    );
};

export default Navbar;
