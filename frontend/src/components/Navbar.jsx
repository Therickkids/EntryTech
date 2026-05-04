import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

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
        { path: '/simulador', label: '📲 Simulador' },
    ];

    if (usuario.rol === 'admin') {
        navLinks.unshift(
            { path: '/dashboard', label: '📊 Dashboard' },
            { path: '/usuarios', label: '👥 Gestión de Usuarios' }
        );
    }

    return (
        <>
            <nav className="navbar" style={{ padding: '0.6rem 1rem', minHeight: '60px' }}>
                {/* IZQUIERDA: Menú y Marca */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={toggleSidebar} className="menu-toggle" style={{ fontSize: '1.25rem', width: '36px', height: '36px' }}>
                        ☰
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
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: '#f1f5f9', color: 'var(--primary-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '800', fontSize: '0.7rem', border: '1px solid var(--border)',
                            overflow: 'hidden'
                        }}>
                            {usuario.foto_url ? <img src={usuario.foto_url} alt="P" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : inicial}
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
                    {navLinks.map(link => (
                        <Link 
                            key={link.path} 
                            to={link.path} 
                            className={`sidebar-link ${location.pathname === link.path ? 'active' : ''}`}
                            onClick={toggleSidebar}
                        >
                            {link.label}
                        </Link>
                    ))}
                    
                    <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                        {!showConfirmLogout ? (
                            <button 
                                onClick={() => setShowConfirmLogout(true)} 
                                className="btn-logout-premium"
                            >
                                <span>Cerrar Sesión</span>
                            </button>
                        ) : (
                            <div className="logout-confirm-box">
                                <p style={{ fontSize: '0.75rem', fontWeight: '800', marginBottom: '0.8rem', color: '#f87171' }}>
                                    ¿Seguro que quieres salir?
                                </p>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={handleLogout} className="btn-logout-confirm">Sí, salir</button>
                                    <button onClick={() => setShowConfirmLogout(false)} className="btn-logout-cancel">No</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ marginTop: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    v2.1 Premium Edition
                </div>
            </aside>
        </>
    );
};

export default Navbar;

