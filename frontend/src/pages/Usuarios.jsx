import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, Pencil, Trash2, UserPlus, X } from 'lucide-react';
import api, { mensajeDeError } from '../services/api';
import { alCerrarSesion, obtenerUsuario } from '../services/session';

/*
  Caché de módulo, vaciada al cerrar sesión para no filtrar el listado de
  personal al siguiente usuario que entre en el mismo navegador.
*/
let cacheUsuarios = [];
let yaSeCargo = false;

alCerrarSesion(() => {
    cacheUsuarios = [];
    yaSeCargo = false;
});

const sinTildes = (valor) =>
    (valor || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const FORM_VACIO = { cedula: '', nombre: '', correo: '', password: '', rol: 'usuario' };

const Usuarios = () => {
    const [usuarios, setUsuarios] = useState(cacheUsuarios);
    const [loading, setLoading] = useState(!yaSeCargo);
    const [error, setError] = useState(null);
    const [aviso, setAviso] = useState(null);
    const [busqueda, setBusqueda] = useState('');

    const [modalCrear, setModalCrear] = useState(false);
    const [formCrear, setFormCrear] = useState(FORM_VACIO);
    const [guardando, setGuardando] = useState(false);
    const [errorModal, setErrorModal] = useState(null);

    const [editandoUser, setEditandoUser] = useState(null);
    const [editForm, setEditForm] = useState({ nombre: '', correo: '', rol: '' });

    const [viendoUser, setViendoUser] = useState(null);
    const [confirmarBorrado, setConfirmarBorrado] = useState(null);

    const usuarioActual = obtenerUsuario();

    const fetchUsuarios = useCallback(async () => {
        try {
            const res = await api.get('/usuarios');
            cacheUsuarios = res.data;
            yaSeCargo = true;
            setUsuarios(res.data);
            setError(null);
        } catch (err) {
            setError(mensajeDeError(err, 'Error al cargar usuarios.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

    // Cerrar cualquier modal con la tecla Escape (antes solo se podía con el ratón).
    useEffect(() => {
        const alPulsar = (e) => {
            if (e.key !== 'Escape') return;
            setModalCrear(false);
            setEditandoUser(null);
            setViendoUser(null);
            setConfirmarBorrado(null);
        };
        window.addEventListener('keydown', alPulsar);
        return () => window.removeEventListener('keydown', alPulsar);
    }, []);

    const usuariosFiltrados = useMemo(() => {
        const q = sinTildes(busqueda.trim());
        if (!q) return usuarios;
        return usuarios.filter((u) =>
            sinTildes(u.nombre).includes(q) ||
            sinTildes(u.correo).includes(q) ||
            sinTildes(u.cedula).includes(q));
    }, [usuarios, busqueda]);

    const handleCrear = async (e) => {
        e.preventDefault();
        setErrorModal(null);
        setGuardando(true);
        try {
            await api.post('/usuarios', formCrear);
            setModalCrear(false);
            setFormCrear(FORM_VACIO);
            setAviso('Usuario creado correctamente.');
            await fetchUsuarios();
        } catch (err) {
            setErrorModal(mensajeDeError(err, 'No se pudo crear el usuario.'));
        } finally {
            setGuardando(false);
        }
    };

    const handleEditClick = (user) => {
        setEditandoUser(user);
        setEditForm({ nombre: user.nombre || '', correo: user.correo || '', rol: user.rol || 'usuario' });
        setErrorModal(null);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setErrorModal(null);
        setGuardando(true);
        try {
            await api.put(`/usuarios/${editandoUser.id}`, editForm);
            setEditandoUser(null);
            setAviso('Usuario actualizado correctamente.');
            await fetchUsuarios();
        } catch (err) {
            // Antes se usaba alert() con un texto fijo: el usuario nunca sabía
            // si había fallado por un correo duplicado o por otra causa.
            setErrorModal(mensajeDeError(err, 'No se pudo actualizar el usuario.'));
        } finally {
            setGuardando(false);
        }
    };

    const handleDelete = async () => {
        const id = confirmarBorrado?.id;
        if (!id) return;
        setGuardando(true);
        try {
            await api.delete(`/usuarios/${id}`);
            setConfirmarBorrado(null);
            setAviso('Usuario eliminado correctamente.');
            await fetchUsuarios();
        } catch (err) {
            setErrorModal(mensajeDeError(err, 'No se pudo eliminar el usuario.'));
        } finally {
            setGuardando(false);
        }
    };

    // `rol` puede llegar nulo desde la base de datos; antes user.rol.toUpperCase()
    // lanzaba una excepción que dejaba la pantalla completamente en blanco.
    const rolTexto = (rol) => (rol || 'usuario').toUpperCase();
    const claseRol = (rol) => (rol === 'admin' ? 'badge-entrada' : 'badge-salida');

    const acciones = (user) => (
        <div style={{ display: 'inline-flex', gap: '0.4rem', flexShrink: 0 }}>
            <button
                onClick={(e) => { e.stopPropagation(); handleEditClick(user); }}
                title={`Editar ${user.nombre}`}
                aria-label={`Editar ${user.nombre}`}
                className="btn-icono"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: 'var(--primary-color)' }}
            >
                <Pencil size={16} />
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); setConfirmarBorrado(user); setErrorModal(null); }}
                title={`Eliminar ${user.nombre}`}
                aria-label={`Eliminar ${user.nombre}`}
                disabled={user.id === usuarioActual?.id}
                className="btn-icono"
                style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: 'var(--danger)',
                    opacity: user.id === usuarioActual?.id ? 0.4 : 1,
                    cursor: user.id === usuarioActual?.id ? 'not-allowed' : 'pointer',
                }}
            >
                <Trash2 size={16} />
            </button>
        </div>
    );

    const avatar = (nombre) => (
        <div style={{
            width: '38px', height: '38px', minWidth: '38px', borderRadius: '10px',
            background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 800, color: 'var(--primary-color)', flexShrink: 0,
        }}>
            {(nombre || '?').charAt(0).toUpperCase()}
        </div>
    );

    const modal = (titulo, contenido, alCerrar) => (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            onClick={alCerrar}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(5,5,10,0.7)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000, padding: 'var(--paso-2)',
                // overflowY permite ver el formulario completo en móviles en
                // horizontal, donde antes quedaba cortado sin posibilidad de scroll.
                overflowY: 'auto',
            }}
        >
            <div
                className="card"
                onClick={(e) => e.stopPropagation()}
                style={{ width: '100%', maxWidth: '440px', padding: 'var(--paso-4) var(--paso-3)', margin: 'auto' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontWeight: 900, margin: 0 }}>{titulo}</h3>
                    <button onClick={alCerrar} className="btn-icono" aria-label="Cerrar" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                        <X size={18} />
                    </button>
                </div>
                {errorModal && <div className="alerta alerta-error" role="alert">{errorModal}</div>}
                {contenido}
            </div>
        </div>
    );

    if (loading) {
        return <main className="main-content"><p>Cargando personal...</p></main>;
    }

    return (
        <main className="main-content" id="contenido">
            <div className="pila-responsive" style={{ justifyContent: 'space-between', marginBottom: 'var(--paso-4)' }}>
                <div style={{ minWidth: 0 }}>
                    <h2 style={{ fontWeight: 900, letterSpacing: '-1.2px' }}>Personal</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                        {usuarios.length} registros activos
                    </p>
                </div>

                <button
                    className="btn btn-primary click-effect"
                    onClick={() => { setFormCrear(FORM_VACIO); setErrorModal(null); setModalCrear(true); }}
                >
                    <UserPlus size={16} /> Nuevo usuario
                </button>
            </div>

            {error && <div className="alerta alerta-error" role="alert">{error}</div>}
            {aviso && <div className="alerta alerta-exito" role="status">{aviso}</div>}

            <div style={{ position: 'relative', maxWidth: '480px', marginBottom: 'var(--paso-3)' }}>
                <span style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, display: 'flex', pointerEvents: 'none' }}>
                    <Search size={16} />
                </span>
                <label className="skip-link" htmlFor="buscador-usuarios">Buscar usuarios</label>
                <input
                    id="buscador-usuarios"
                    type="search"
                    className="form-control"
                    placeholder="Buscar por nombre, cédula o correo..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    style={{ paddingLeft: '3rem' }}
                />
            </div>

            {/* Tabla en escritorio */}
            <div className="card solo-escritorio" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Cédula</th>
                                <th>Correo</th>
                                <th style={{ textAlign: 'center' }}>Rol</th>
                                <th style={{ textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuariosFiltrados.length > 0 ? usuariosFiltrados.map((user) => (
                                <tr key={user.id} onClick={() => setViendoUser(user)} style={{ cursor: 'pointer' }}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', minWidth: 0 }}>
                                            {avatar(user.nombre)}
                                            <span className="texto-truncado" style={{ fontWeight: 700, maxWidth: '180px' }}>
                                                {user.nombre || 'Sin nombre'}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{user.cedula}</td>
                                    <td style={{ color: 'var(--text-muted)', maxWidth: '220px' }}>
                                        <span className="texto-truncado" style={{ display: 'block' }}>{user.correo}</span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`badge ${claseRol(user.rol)}`}>{rolTexto(user.rol)}</span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>{acciones(user)}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No se encontraron resultados para &quot;{busqueda}&quot;
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Tarjetas en móvil */}
            <div className="solo-movil">
                {usuariosFiltrados.length > 0 ? usuariosFiltrados.map((user) => (
                    <div
                        key={user.id}
                        onClick={() => setViendoUser(user)}
                        style={{
                            background: 'var(--surface)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radio-md)', padding: 'var(--paso-2)',
                            marginBottom: '0.75rem', display: 'flex', alignItems: 'center',
                            gap: '0.75rem', cursor: 'pointer', flexWrap: 'wrap',
                        }}
                    >
                        {avatar(user.nombre)}
                        <div style={{ flex: '1 1 120px', minWidth: 0 }}>
                            <div className="texto-truncado" style={{ fontWeight: 700 }}>{user.nombre || 'Sin nombre'}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user.cedula}</div>
                        </div>
                        <span className={`badge ${claseRol(user.rol)}`} style={{ fontSize: '0.6rem' }}>
                            {rolTexto(user.rol)}
                        </span>
                        {acciones(user)}
                    </div>
                )) : (
                    <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No se encontraron resultados para &quot;{busqueda}&quot;
                    </div>
                )}
            </div>

            {/* Alta de usuario: completa el CRUD que exige el requisito RF-01 */}
            {modalCrear && modal('Nuevo usuario', (
                <form onSubmit={handleCrear}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="crear-cedula">Cédula</label>
                        <input id="crear-cedula" className="form-control" inputMode="numeric" required
                            value={formCrear.cedula} onChange={(e) => setFormCrear({ ...formCrear, cedula: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="crear-nombre">Nombre completo</label>
                        <input id="crear-nombre" className="form-control" required
                            value={formCrear.nombre} onChange={(e) => setFormCrear({ ...formCrear, nombre: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="crear-correo">Correo electrónico</label>
                        <input id="crear-correo" type="email" className="form-control" required
                            value={formCrear.correo} onChange={(e) => setFormCrear({ ...formCrear, correo: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="crear-password">Contraseña temporal</label>
                        <input id="crear-password" type="password" className="form-control" required autoComplete="new-password"
                            value={formCrear.password} onChange={(e) => setFormCrear({ ...formCrear, password: e.target.value })} />
                        <span className="form-hint">Mínimo 8 caracteres, con letras y números.</span>
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="crear-rol">Rol de acceso</label>
                        <select id="crear-rol" className="form-control"
                            value={formCrear.rol} onChange={(e) => setFormCrear({ ...formCrear, rol: e.target.value })}>
                            <option value="usuario">Usuario estándar</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>
                    <div className="pila-responsive" style={{ marginTop: 'var(--paso-3)' }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={guardando}>
                            {guardando ? 'Creando...' : 'Crear usuario'}
                        </button>
                        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setModalCrear(false)}>
                            Cancelar
                        </button>
                    </div>
                </form>
            ), () => setModalCrear(false))}

            {editandoUser && modal('Editar perfil', (
                <form onSubmit={handleSaveEdit}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Cédula: {editandoUser.cedula}
                    </p>
                    <div className="form-group">
                        <label className="form-label" htmlFor="edit-nombre">Nombre completo</label>
                        <input id="edit-nombre" className="form-control" required
                            value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="edit-correo">Correo electrónico</label>
                        <input id="edit-correo" type="email" className="form-control" required
                            value={editForm.correo} onChange={(e) => setEditForm({ ...editForm, correo: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="edit-rol">Rol de acceso</label>
                        <select id="edit-rol" className="form-control"
                            value={editForm.rol} onChange={(e) => setEditForm({ ...editForm, rol: e.target.value })}>
                            <option value="usuario">Usuario estándar</option>
                            <option value="admin">Administrador</option>
                        </select>
                        {editandoUser.id === usuarioActual?.id && (
                            <span className="form-hint">No puedes quitarte tu propio rol de administrador.</span>
                        )}
                    </div>
                    <div className="pila-responsive" style={{ marginTop: 'var(--paso-3)' }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={guardando}>
                            {guardando ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditandoUser(null)}>
                            Salir
                        </button>
                    </div>
                </form>
            ), () => setEditandoUser(null))}

            {/* Confirmación de borrado: sustituye a window.confirm, que no es
                estilizable y en algunos navegadores móviles se bloquea. */}
            {confirmarBorrado && modal('Eliminar usuario', (
                <>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Se eliminará <strong style={{ color: 'var(--text-main)' }}>{confirmarBorrado.nombre}</strong> junto
                        con su carnet y todo su historial de accesos.
                    </p>
                    <p className="form-hint" style={{ marginBottom: 'var(--paso-3)' }}>Esta acción no se puede deshacer.</p>
                    <div className="pila-responsive">
                        <button className="btn btn-danger" style={{ flex: 2 }} onClick={handleDelete} disabled={guardando}>
                            {guardando ? 'Eliminando...' : 'Sí, eliminar'}
                        </button>
                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmarBorrado(null)}>
                            Cancelar
                        </button>
                    </div>
                </>
            ), () => setConfirmarBorrado(null))}

            {viendoUser && modal('Detalle del usuario', (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                        {avatar(viendoUser.nombre)}
                        <div style={{ minWidth: 0 }}>
                            <h4 style={{ margin: 0, fontWeight: 900, wordBreak: 'break-word' }}>{viendoUser.nombre}</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                                Cédula: {viendoUser.cedula}
                            </p>
                        </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radio-md)', padding: 'var(--paso-2)' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary-color)' }}>CORREO ELECTRÓNICO</div>
                            <div style={{ wordBreak: 'break-all', fontWeight: 600 }}>{viendoUser.correo}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary-color)', marginBottom: '0.3rem' }}>ROL DE ACCESO</div>
                            <span className={`badge ${claseRol(viendoUser.rol)}`}>{rolTexto(viendoUser.rol)}</span>
                        </div>
                    </div>
                    <button className="btn btn-secondary btn-block" style={{ marginTop: 'var(--paso-3)' }} onClick={() => setViendoUser(null)}>
                        Cerrar
                    </button>
                </>
            ), () => setViendoUser(null))}
        </main>
    );
};

export default Usuarios;
