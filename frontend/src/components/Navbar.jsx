import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        navigate('/login');
    };

    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const inicial = usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : '?';

    return (
        <nav className="navbar">
            <div className="navbar-brand">EntryTech</div>
            <div className="navbar-menu">
                {usuario.rol === 'admin' && (
                    <>
                        <Link to="/usuarios" className={`nav-link ${location.pathname === '/usuarios' ? 'active' : ''}`}>
                            Gestión de Usuarios
                        </Link>
                        <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
                            Dashboard
                        </Link>
                    </>
                )}
                <Link to="/carnet" className={`nav-link ${location.pathname === '/carnet' ? 'active' : ''}`}>
                    Mi Carnet
                </Link>
                <Link to="/simulador" className={`nav-link ${location.pathname === '/simulador' ? 'active' : ''}`}>
                    Simulador
                </Link>

                {/* Avatar + Nombre del usuario */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary-color), var(--secondary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: '700', fontSize: '0.9rem',
                        boxShadow: '0 2px 8px rgba(79,70,229,0.4)',
                        overflow: 'hidden', flexShrink: 0
                    }}>
                        {usuario.foto_url
                            ? <img src={usuario.foto_url} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : inicial
                        }
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>
                        {usuario.nombre?.split(' ')[0] || 'Usuario'}
                    </span>
                </div>

                <button onClick={handleLogout} className="btn-logout">Cerrar Sesión</button>
            </div>
        </nav>
    );
};

export default Navbar;

