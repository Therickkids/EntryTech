import React, { useEffect, useState } from 'react';
import api from '../services/api';

const Usuarios = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
            fetchUsuarios(); // Recargar lista
        } catch (error) {
            alert('Error al actualizar el usuario');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;
        
        try {
            await api.delete(`/usuarios/${id}`);
            fetchUsuarios(); // Recargar lista
        } catch (error) {
            alert('Error al eliminar el usuario');
        }
    };

    if (loading) return <div className="main-content"><p>Cargando usuarios...</p></div>;
    if (error) return <div className="main-content"><div className="card"><p style={{color: 'red'}}>{error}</p></div></div>;

    return (
        <div className="main-content">
            <h2 style={{ marginBottom: '1.5rem' }}>Gestión de Usuarios</h2>
            <div className="card">
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Cédula</th>
                                <th>Nombre</th>
                                <th>Correo</th>
                                <th>Rol</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.cedula}</td>
                                    <td>
                                        {editandoId === user.id ? (
                                            <input 
                                                type="text" 
                                                className="form-control"
                                                style={{ padding: '0.4rem', fontSize: '0.9rem' }}
                                                value={editForm.nombre} 
                                                onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
                                            />
                                        ) : (
                                            user.nombre
                                        )}
                                    </td>
                                    <td>
                                        {editandoId === user.id ? (
                                            <input 
                                                type="email" 
                                                className="form-control"
                                                style={{ padding: '0.4rem', fontSize: '0.9rem' }}
                                                value={editForm.correo} 
                                                onChange={(e) => setEditForm({...editForm, correo: e.target.value})}
                                            />
                                        ) : (
                                            user.correo
                                        )}
                                    </td>
                                    <td>
                                        {editandoId === user.id ? (
                                            <div style={{ position: 'relative', width: '130px' }}>
                                                <div 
                                                    className="form-control" 
                                                    style={{ 
                                                        cursor: 'pointer', 
                                                        padding: '0.4rem 0.8rem', 
                                                        fontSize: '0.9rem',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        backgroundColor: 'white'
                                                    }}
                                                    onClick={() => setEditForm(prev => ({...prev, dropdownOpen: !prev.dropdownOpen}))}
                                                >
                                                    <span style={{ fontWeight: '500' }}>{editForm.rol.charAt(0).toUpperCase() + editForm.rol.slice(1)}</span>
                                                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>▼</span>
                                                </div>
                                                {editForm.dropdownOpen && (
                                                    <div style={{ 
                                                        position: 'absolute', 
                                                        top: '100%', 
                                                        left: 0, 
                                                        right: 0, 
                                                        backgroundColor: 'white', 
                                                        border: '1px solid #e2e8f0', 
                                                        borderRadius: '8px', 
                                                        marginTop: '4px', 
                                                        zIndex: 50, 
                                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div 
                                                            style={{ padding: '0.6rem 0.8rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontWeight: '500' }}
                                                            onClick={() => setEditForm({...editForm, rol: 'usuario', dropdownOpen: false})}
                                                            onMouseEnter={(e) => { e.target.style.backgroundColor = '#f8fafc'; e.target.style.color = 'var(--primary-color)' }}
                                                            onMouseLeave={(e) => { e.target.style.backgroundColor = 'white'; e.target.style.color = 'inherit' }}
                                                        >
                                                            Usuario
                                                        </div>
                                                        <div 
                                                            style={{ padding: '0.6rem 0.8rem', cursor: 'pointer', fontWeight: '500' }}
                                                            onClick={() => setEditForm({...editForm, rol: 'admin', dropdownOpen: false})}
                                                            onMouseEnter={(e) => { e.target.style.backgroundColor = '#f8fafc'; e.target.style.color = 'var(--primary-color)' }}
                                                            onMouseLeave={(e) => { e.target.style.backgroundColor = 'white'; e.target.style.color = 'inherit' }}
                                                        >
                                                            Admin
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className={`badge ${user.rol === 'admin' ? 'badge-entrada' : 'badge-salida'}`}>
                                                {user.rol.toUpperCase()}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {editandoId === user.id ? (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => handleSaveEdit(user.id)} className="btn btn-primary btn-sm">Guardar</button>
                                                <button onClick={handleCancelEdit} className="btn btn-secondary btn-sm">Cancelar</button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button onClick={() => handleEditClick(user)} className="btn btn-primary btn-sm">Editar</button>
                                                <button onClick={() => handleDelete(user.id)} className="btn btn-danger btn-sm">Eliminar</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {usuarios.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center' }}>No hay usuarios registrados.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Usuarios;
