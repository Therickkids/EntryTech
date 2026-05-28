import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, QrCode, BookOpen, Menu, X, LogOut, AlertTriangle } from 'lucide-react';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [showConfirmLogout, setShowConfirmLogout] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        navigate('/login');
    };

    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const inicial = usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : '?';

    const toggleSidebar = () => setIsOpen(!isOpen);

    const navLinks = [
        { path: '/simulador', label: 'Simulador', icon: <QrCode size={18} /> },
        { path: '/manual', label: 'Manual de Usuario', icon: <BookOpen size={18} /> },
    ];

    if (usuario.rol === 'admin') {
        navLinks.unshift(
            { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
            { path: '/usuarios', label: 'Gestión de Usuarios', icon: <Users size={18} /> }
        );
    }

    return (
        <>
            <nav className="navbar" style={{ padding: '0.6rem 1rem', minHeight: '60px' }}>
                {/* IZQUIERDA: Menú y Marca */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={toggleSidebar} className="menu-toggle" style={{ fontSize: '1.25rem', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <div className="navbar-brand" style={{ fontSize: '1rem', fontWeight: '800' }}>EntryTech</div>
                </div>

                {/* DERECHA: Mi Carnet + Perfil */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Link to="/carnet" className={`nav-link ${location.pathname === '/carnet' ? 'active' : ''}`} style={{ fontSize: '0.75rem', fontWeight: '700' }}>
                        Mi Carnet
                    </Link>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid var(--border)', paddingLeft: '0.75rem' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary-color), var(--secondary))',
                            padding: '2px',
                            boxShadow: '0 0 12px rgba(99,102,241,0.5)',
                            flexShrink: 0,
                        }}>
                            <div style={{
                                width: '100%', height: '100%', borderRadius: '50%',
                                background: 'rgba(10,10,12,0.9)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: '800', fontSize: '0.7rem', color: 'var(--primary-color)',
                                overflow: 'hidden'
                            }}>
                                {usuario.foto_url ? <img src={usuario.foto_url} alt="P" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : inicial}
                            </div>
                        </div>
                        <span className="nav-name" style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-main)', opacity: 0.8 }}>
                            {usuario.nombre?.split(' ')[0]}
                        </span>
                    </div>
                </div>
            </nav>

            {/* Sidebar Overlay */}
            <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={toggleSidebar}></div>

            {/* Sidebar Drawer */}
            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="navbar-brand" style={{ fontSize: '1.5rem' }}>EntryTech</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Sesión de <strong>{usuario.nombre || 'Usuario'}</strong>
                    </p>
                </div>

                <div className="sidebar-menu">
                    {navLinks.map((link, idx) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`sidebar-link animate-slide-up ${location.pathname === link.path ? 'active' : ''}`}
                            style={{ animationDelay: `${idx * 60}ms`, display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                            onClick={toggleSidebar}
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
                            >
                                <LogOut size={18} />
                                <span>Cerrar Sesión</span>
                            </button>
                        ) : (
                            <div className="logout-confirm-box">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.8rem', color: '#f87171' }}>
                                    <AlertTriangle size={16} />
                                    <p style={{ fontSize: '0.75rem', fontWeight: '800', margin: 0 }}>
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

                <div style={{ marginTop: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    <span style={{
                        display: 'inline-block', padding: '0.2rem 0.7rem',
                        borderRadius: '20px', border: '1px solid rgba(99,102,241,0.3)',
                        color: 'var(--primary-color)', fontWeight: '700', fontSize: '0.65rem',
                        background: 'rgba(99,102,241,0.08)'
                    }}>✦ v3.0 Ultra-Premium</span>
                </div>
            </aside>
        </>
    );
};

export default Navbar;
