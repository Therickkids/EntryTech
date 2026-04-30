import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';

const Usuarios = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editandoUser, setEditandoUser] = useState(null);
    const [editForm, setEditForm] = useState({ nombre: '', correo: '', rol: '' });

    const fetchUsuarios = async () => {
        try {
            const res = await api.get('/usuarios');
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
        const q = busqueda.toLowerCase().trim();
        if (!q) return usuarios;

        return usuarios.filter(u => {
            const nombre = (u.nombre || '').toLowerCase();
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
        <div className="main-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-1.2px', marginBottom: '0.2rem' }}>Personal</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>{usuarios.length} registros activos</p>
                </div>
                
                <div style={{ position: 'relative', flex: '1', maxWidth: '400px', minWidth: '280px' }}>
                    <div style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</div>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar por nombre, ID o correo..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        style={{ paddingLeft: '3rem', borderRadius: '14px', height: '50px', background: 'white', border: '1.5px solid var(--border)' }}
                    />
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', background: 'white' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid var(--border)' }}>
                                <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Usuario</th>
                                <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cédula</th>
                                <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }} className="hide-mobile">Correo</th>
                                <th style={{ padding: '1.2rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rol</th>
                                <th style={{ padding: '1.2rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuariosFiltrados.map((user) => (
                                <tr key={user.id} className="table-row-hover" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '1rem 1.2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: '800', color: 'var(--primary-color)' }}>
                                                {user.nombre.charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{user.nombre}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.2rem', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>{user.cedula}</td>
                                    <td style={{ padding: '1.2rem', fontSize: '0.9rem', color: 'var(--text-muted)' }} className="hide-mobile">{user.correo}</td>
                                    <td style={{ padding: '1.2rem' }}>
                                        <span className={`badge ${user.rol === 'admin' ? 'badge-entrada' : 'badge-salida'}`} style={{ fontSize: '0.65rem', borderRadius: '8px' }}>
                                            {user.rol.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1.2rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleEditClick(user)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7, transition: 'opacity 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.opacity=1} onMouseLeave={(e)=>e.currentTarget.style.opacity=0.7}>✏️</button>
                                            <button onClick={() => handleDelete(user.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7, transition: 'opacity 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.opacity=1} onMouseLeave={(e)=>e.currentTarget.style.opacity=0.7}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalAbierto && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
                    <div className="card shadow-lg" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', borderRadius: '28px', background: 'white', border: 'none' }}>
                        <div style={{ marginBottom: '1.8rem' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.5px' }}>Editar Perfil</h3>
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

            <style>{`
                .table-row-hover:hover { background-color: #f8fafc; }
                @media (max-width: 768px) {
                    .hide-mobile { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default Usuarios;
