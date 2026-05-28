import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { Search, Pencil, Trash2 } from 'lucide-react';

let globalUsuariosCache = [];
let hasFetchedUsuariosInitially = false;

const Usuarios = () => {
    const [usuarios, setUsuarios] = useState(globalUsuariosCache);
    const [loading, setLoading] = useState(!hasFetchedUsuariosInitially);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editandoUser, setEditandoUser] = useState(null);
    const [editForm, setEditForm] = useState({ nombre: '', correo: '', rol: '' });
    
    // Modal de solo lectura para ver todos los detalles (nombres largos)
    const [viendoUser, setViendoUser] = useState(null);

    const fetchUsuarios = async () => {
        try {
            const res = await api.get('/usuarios');
            globalUsuariosCache = res.data;
            hasFetchedUsuariosInitially = true;
            setUsuarios(res.data);
            setError(null);
        } catch (err) {
            setError('Error al cargar usuarios.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const usuariosFiltrados = useMemo(() => {
        const q = busqueda.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (!q) return usuarios;
        return usuarios.filter(u => {
            const nombre = (u.nombre || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const correo = (u.correo || '').toLowerCase();
            const cedula = (u.cedula || '').toString().toLowerCase();
            return nombre.includes(q) || correo.includes(q) || cedula.includes(q);
        });
    }, [usuarios, busqueda]);

    const handleEditClick = (user) => {
        setEditandoUser(user);
        setEditForm({ nombre: user.nombre, correo: user.correo, rol: user.rol });
        setModalAbierto(true);
    };

    const handleSaveEdit = async () => {
        try {
            await api.put(`/usuarios/${editandoUser.id}`, editForm);
            setModalAbierto(false);
            fetchUsuarios();
        } catch (error) {
            alert('Error al actualizar');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este usuario?')) return;
        try {
            await api.delete(`/usuarios/${id}`);
            fetchUsuarios();
        } catch (error) {
            alert('Error al eliminar');
        }
    };

    if (loading) return <div className="main-content"><p>Cargando personal...</p></div>;

    return (
        <div className="main-content" style={{ paddingBottom: '3rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-1.2px', marginBottom: '0.2rem' }}>Personal</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>{usuarios.length} registros activos</p>
                </div>
                
                <div style={{ position: 'relative', flex: '1', maxWidth: '400px', minWidth: '260px' }}>
                    <div style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none', display: 'flex' }}>
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar por nombre, ID o correo..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        style={{ paddingLeft: '3rem', borderRadius: '14px', height: '50px', background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', border: '1.5px solid var(--border)' }}
                    />
                </div>
            </div>

            {/* ── DESKTOP TABLE ── */}
            <div className="card desktop-table" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1.5px solid var(--border)' }}>
                                <th style={thStyle}>Usuario</th>
                                <th style={thStyle}>Cédula</th>
                                <th style={thStyle}>Correo</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Rol</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuariosFiltrados.length > 0 ? (
                                usuariosFiltrados.map((user) => (
                                    <tr key={user.id} className="table-row-hover" onClick={() => setViendoUser(user)} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                                        {/* Nombre */}
                                        <td style={{ padding: '1rem 1.2rem', maxWidth: '220px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                                <div style={avatarStyle}>{(user.nombre || '?').charAt(0).toUpperCase()}</div>
                                                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px', display: 'block' }}>
                                                    {user.nombre || 'Sin Nombre'}
                                                </span>
                                            </div>
                                        </td>
                                        {/* Cédula */}
                                        <td style={{ padding: '1rem 1.2rem', fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: '500', whiteSpace: 'nowrap' }}>{user.cedula}</td>
                                        {/* Correo */}
                                        <td style={{ padding: '1rem 1.2rem', fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.correo}</td>
                                        {/* Rol */}
                                        <td style={{ padding: '1rem 1.2rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            <span className={`badge ${user.rol === 'admin' ? 'badge-entrada' : 'badge-salida'}`} style={{ fontSize: '0.65rem', borderRadius: '8px' }}>
                                                {user.rol.toUpperCase()}
                                            </span>
                                        </td>
                                        {/* Acciones */}
                                        <td style={{ padding: '1rem 1.2rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <button onClick={(e) => { e.stopPropagation(); handleEditClick(user); }} title="Editar" style={editBtnStyle}
                                                    onMouseEnter={e => e.currentTarget.style.background='rgba(99,102,241,0.25)'}
                                                    onMouseLeave={e => e.currentTarget.style.background='rgba(99,102,241,0.1)'}>
                                                    <Pencil size={15} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }} title="Eliminar" style={deleteBtnStyle}
                                                    onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.25)'}
                                                    onMouseLeave={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'}>
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No se encontraron resultados para "{busqueda}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── MOBILE CARDS ── */}
            <div className="mobile-cards">
                {usuariosFiltrados.length > 0 ? (
                    usuariosFiltrados.map((user) => (
                        <div key={user.id} onClick={() => setViendoUser(user)} style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: '16px',
                            padding: '1rem 1.2rem',
                            marginBottom: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.9rem',
                            cursor: 'pointer'
                        }}>
                            {/* Avatar */}
                            <div style={avatarStyle}>{(user.nombre || '?').charAt(0).toUpperCase()}</div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {user.nombre || 'Sin Nombre'}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {user.cedula}
                                </div>
                            </div>

                            {/* Rol badge */}
                            <span className={`badge ${user.rol === 'admin' ? 'badge-entrada' : 'badge-salida'}`}
                                style={{ fontSize: '0.6rem', borderRadius: '8px', flexShrink: 0 }}>
                                {user.rol.toUpperCase()}
                            </span>

                            {/* Buttons — always visible, side by side */}
                            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                                <button onClick={(e) => { e.stopPropagation(); handleEditClick(user); }} title="Editar" style={editBtnStyle}
                                    onMouseEnter={e => e.currentTarget.style.background='rgba(99,102,241,0.25)'}
                                    onMouseLeave={e => e.currentTarget.style.background='rgba(99,102,241,0.1)'}>
                                    <Pencil size={15} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }} title="Eliminar" style={deleteBtnStyle}
                                    onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.25)'}
                                    onMouseLeave={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'}>
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No se encontraron resultados para "{busqueda}"
                    </div>
                )}
            </div>

            {/* Modal editar */}
            {modalAbierto && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
                    <div className="card shadow-lg" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', borderRadius: '28px', background: 'var(--surface)', border: '1px solid var(--border)', backdropFilter: 'blur(30px)' }}>
                        <div style={{ marginBottom: '1.8rem' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.5px', color: 'var(--text-main)' }}>Editar Perfil</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Cédula: {editandoUser?.cedula}</p>
                        </div>
                        
                        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                            <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary-color)' }}>NOMBRE COMPLETO</label>
                            <input className="form-control" style={{ height: '48px' }} value={editForm.nombre} onChange={e => setEditForm({...editForm, nombre: e.target.value})} />
                        </div>
                        
                        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                            <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary-color)' }}>CORREO ELECTRÓNICO</label>
                            <input className="form-control" style={{ height: '48px' }} value={editForm.correo} onChange={e => setEditForm({...editForm, correo: e.target.value})} />
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary-color)' }}>ROL DE ACCESO</label>
                            <select className="form-control" style={{ height: '48px' }} value={editForm.rol} onChange={e => setEditForm({...editForm, rol: e.target.value})}>
                                <option value="usuario">Usuario Estándar</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
                            <button onClick={handleSaveEdit} className="btn btn-primary" style={{ flex: 2 }}>Guardar</button>
                            <button onClick={() => setModalAbierto(false)} className="btn btn-secondary" style={{ flex: 1 }}>Salir</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Solo Vista (Ver Detalles) */}
            {viendoUser && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }} onClick={() => setViendoUser(null)}>
                    <div className="card shadow-lg" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', borderRadius: '28px', background: 'var(--surface)', border: '1px solid var(--border)', backdropFilter: 'blur(30px)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '1.8rem' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: '800', color: 'var(--primary-color)' }}>
                                {(viendoUser.nombre || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: '900', letterSpacing: '-0.5px', color: 'var(--text-main)', margin: 0, wordBreak: 'break-word' }}>
                                    {viendoUser.nombre}
                                </h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', margin: '0.2rem 0 0 0' }}>Cédula: {viendoUser.cedula}</p>
                            </div>
                        </div>
                        
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.2rem', marginBottom: '1.5rem' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary-color)', marginBottom: '0.3rem' }}>CORREO ELECTRÓNICO</div>
                                <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', wordBreak: 'break-all', fontWeight: '600' }}>{viendoUser.correo}</div>
                            </div>
                            
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary-color)', marginBottom: '0.3rem' }}>ROL DE ACCESO</div>
                                <div>
                                    <span className={`badge ${viendoUser.rol === 'admin' ? 'badge-entrada' : 'badge-salida'}`} style={{ fontSize: '0.75rem', borderRadius: '8px' }}>
                                        {viendoUser.rol.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', marginTop: '1.5rem' }}>
                            <button onClick={() => setViendoUser(null)} className="btn btn-secondary" style={{ width: '100%' }}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .table-row-hover:hover { background-color: rgba(255,255,255,0.04); }

                /* Desktop: show table, hide cards */
                .desktop-table { display: block; }
                .mobile-cards  { display: none; }

                /* Mobile: hide table, show cards */
                @media (max-width: 700px) {
                    .desktop-table { display: none !important; }
                    .mobile-cards  { display: block !important; }
                }
            `}</style>
        </div>
    );
};

/* ── Shared style objects ── */
const thStyle = {
    padding: '1.1rem 1.2rem',
    textAlign: 'left',
    fontSize: '0.72rem',
    fontWeight: '800',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
};

const avatarStyle = {
    width: '36px',
    height: '36px',
    minWidth: '36px',
    borderRadius: '10px',
    background: 'rgba(99,102,241,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.9rem',
    fontWeight: '800',
    color: 'var(--primary-color)',
    flexShrink: 0,
};

const editBtnStyle = {
    background: 'rgba(99,102,241,0.1)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    padding: '0.4rem',
    display: 'flex',
    alignItems: 'center',
    color: 'var(--primary-color)',
    transition: 'background 0.2s',
};

const deleteBtnStyle = {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    padding: '0.4rem',
    display: 'flex',
    alignItems: 'center',
    color: '#ef4444',
    transition: 'background 0.2s',
};

export default Usuarios;
