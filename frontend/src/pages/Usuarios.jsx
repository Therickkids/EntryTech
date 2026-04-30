import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';

const Usuarios = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [editandoId, setEditandoId] = useState(null);
    const [editForm, setEditForm] = useState({ nombre: '', correo: '', rol: '' });

    const fetchUsuarios = async () => {
        try {
            const res = await api.get('/usuarios');
            setUsuarios(res.data);
            setError(null);
        } catch (err) {
            setError('Error al cargar usuarios. Asegúrate de tener permisos de administrador.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const usuariosFiltrados = useMemo(() => {
        if (!busqueda.trim()) return usuarios;
        const q = busqueda.toLowerCase();
        return usuarios.filter(u => 
            u.nombre?.toLowerCase().includes(q) || 
            u.correo?.toLowerCase().includes(q) ||
            u.cedula?.toLowerCase().includes(q)
        );
    }, [usuarios, busqueda]);

    const handleEditClick = (user) => {
        setEditandoId(user.id);
        setEditForm({ nombre: user.nombre, correo: user.correo, rol: user.rol });
    };

    const handleCancelEdit = () => {
        setEditandoId(null);
        setEditForm({ nombre: '', correo: '', rol: '' });
    };

    const handleSaveEdit = async (id) => {
        try {
            await api.put(`/usuarios/${id}`, editForm);
            setEditandoId(null);
            fetchUsuarios();
        } catch (error) {
            alert('Error al actualizar el usuario');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;
        try {
            await api.delete(`/usuarios/${id}`);
            fetchUsuarios();
        } catch (error) {
            alert('Error al eliminar el usuario');
        }
    };

    if (loading) return <div className="main-content"><p>Cargando usuarios...</p></div>;

    return (
        <div className="main-content" style={{ paddingBottom: '5rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '900', letterSpacing: '-1px' }}>Gestión de Usuarios</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Administra los accesos y roles de tu personal</p>
            </div>

            {/* Buscador Premium */}
            <div style={{ position: 'relative', maxWidth: '600px', marginBottom: '2.5rem' }}>
                <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', opacity: 0.5 }}>🔍</div>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar por nombre, correo o cédula..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    style={{ paddingLeft: '3.2rem', height: '52px', borderRadius: '50px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
                />
            </div>

            {error && <div className="card" style={{ color: 'var(--danger)', borderLeft: '4px solid var(--danger)' }}>{error}</div>}

            {/* Grid de Usuarios */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '1.25rem' 
            }}>
                {usuariosFiltrados.map((user) => (
                    <div key={user.id} className="card" style={{ 
                        margin: 0, 
                        padding: '1.5rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '1rem',
                        position: 'relative',
                        border: editandoId === user.id ? '2px solid var(--primary-color)' : '1px solid rgba(0,0,0,0.03)',
                        borderRadius: '24px'
                    }}>
                        {/* Cabecera Tarjeta: Avatar + Rol */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ 
                                width: '50px', height: '50px', borderRadius: '16px', 
                                background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary-color)'
                            }}>
                                {user.nombre?.charAt(0).toUpperCase()}
                            </div>
                            <span className={`badge ${user.rol === 'admin' ? 'badge-entrada' : 'badge-salida'}`}>
                                {user.rol.toUpperCase()}
                            </span>
                        </div>

                        {/* Cuerpo Tarjeta: Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {editandoId === user.id ? (
                                <>
                                    <input 
                                        className="form-control" 
                                        style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}
                                        value={editForm.nombre} 
                                        onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
                                        placeholder="Nombre completo"
                                    />
                                    <input 
                                        className="form-control" 
                                        style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}
                                        value={editForm.correo} 
                                        onChange={(e) => setEditForm({...editForm, correo: e.target.value})}
                                        placeholder="Correo electrónico"
                                    />
                                    <select 
                                        className="form-control"
                                        style={{ fontSize: '0.9rem' }}
                                        value={editForm.rol}
                                        onChange={(e) => setEditForm({...editForm, rol: e.target.value})}
                                    >
                                        <option value="usuario">Usuario</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#1a1a1a' }}>{user.nombre}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        📧 {user.correo}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        🆔 {user.cedula}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Pie Tarjeta: Acciones */}
                        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem' }}>
                            {editandoId === user.id ? (
                                <>
                                    <button onClick={() => handleSaveEdit(user.id)} className="btn btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>Guardar</button>
                                    <button onClick={handleCancelEdit} className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>Cancelar</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => handleEditClick(user)} className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}>✏️ Editar</button>
                                    <button onClick={() => handleDelete(user.id)} className="btn" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', background: '#fee2e2', color: '#dc2626' }}>🗑️ Eliminar</button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {usuariosFiltrados.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
                    <p>No se encontraron usuarios que coincidan con la búsqueda.</p>
                </div>
            )}
        </div>
    );
};

export default Usuarios;

export default Usuarios;
