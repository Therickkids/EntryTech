import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        navigate('/login');
    };

    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const inicial = usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : '?';

    const toggleSidebar = () => setIsOpen(!isOpen);

    const navLinks = [
        { path: '/carnet', label: '🪪 Mi Carnet' },
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
            <nav className="navbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={toggleSidebar} className="menu-toggle" title="Menú">
                        {isOpen ? '✕' : '☰'}
                    </button>
                    <div className="navbar-brand">EntryTech</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: '#f1f5f9', color: 'var(--primary-color)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '800', fontSize: '0.8rem', border: '1px solid var(--border)'
                    }}>
                        {usuario.foto_url ? <img src={usuario.foto_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : inicial}
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
                    
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />
                    
                    <button onClick={handleLogout} className="btn-logout" style={{ width: '100%', textAlign: 'left', padding: '0.85rem 1rem' }}>
                        🚪 Cerrar Sesión
                    </button>
                </div>

                <div style={{ marginTop: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    v2.1 Premium Edition
                </div>
            </aside>
        </>
    );
};

export default Navbar;

