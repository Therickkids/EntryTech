import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { TrendingUp, Users, ClipboardList, Clock, Download, Search, LogIn, LogOut, RefreshCw } from 'lucide-react';
import api, { mensajeDeError } from '../services/api';
import { alCerrarSesion } from '../services/session';

const POR_PAGINA = 25;
const INTERVALO_REFRESCO_MS = 30000;

/*
  Caché a nivel de módulo para no mostrar la pantalla vacía al volver a entrar.
  Se vacía al cerrar sesión: antes sobrevivía al logout y el siguiente usuario
  que iniciara sesión en el mismo navegador veía durante unos instantes los
  registros de accesos del anterior.
*/
let cacheAccesos = [];
let yaSeCargo = false;

alCerrarSesion(() => {
    cacheAccesos = [];
    yaSeCargo = false;
});

const sinTildes = (valor) =>
    (valor || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Escapa un campo para CSV duplicando las comillas internas (RFC 4180). */
const campoCsv = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;

const Dashboard = () => {
    const [accesos, setAccesos] = useState(cacheAccesos);
    const [loading, setLoading] = useState(!yaSeCargo);
    const [error, setError] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [pagina, setPagina] = useState(1);
    const [refrescando, setRefrescando] = useState(false);

    const fetchAccesos = useCallback(async ({ silencioso = false } = {}) => {
        if (!silencioso) setRefrescando(true);
        try {
            const res = await api.get('/accesos', { params: { limit: 500 } });
            const data = Array.isArray(res.data) ? res.data : [];
            data.sort((a, b) => b.id - a.id);
            cacheAccesos = data;
            yaSeCargo = true;
            setAccesos(data);
            setError(null);
        } catch (err) {
            setError(mensajeDeError(err, 'No se pudo cargar el historial de accesos.'));
        } finally {
            setLoading(false);
            setRefrescando(false);
        }
    }, []);

    useEffect(() => {
        fetchAccesos({ silencioso: true });

        /*
          El refresco automático se detiene cuando la pestaña no está visible.
          Antes el intervalo seguía disparando una petición cada 30 segundos
          aunque el panel llevara horas en segundo plano.
        */
        let intervalo = null;

        const iniciar = () => {
            if (intervalo) return;
            intervalo = setInterval(() => fetchAccesos({ silencioso: true }), INTERVALO_REFRESCO_MS);
        };

        const detener = () => {
            if (!intervalo) return;
            clearInterval(intervalo);
            intervalo = null;
        };

        const alCambiarVisibilidad = () => {
            if (document.hidden) {
                detener();
            } else {
                fetchAccesos({ silencioso: true });
                iniciar();
            }
        };

        if (!document.hidden) iniciar();
        document.addEventListener('visibilitychange', alCambiarVisibilidad);

        return () => {
            detener();
            document.removeEventListener('visibilitychange', alCambiarVisibilidad);
        };
    }, [fetchAccesos]);

    const accesosFiltrados = useMemo(() => {
        const q = sinTildes(busqueda.trim());
        if (!q) return accesos;
        return accesos.filter((a) =>
            sinTildes(a.nombre).includes(q) ||
            sinTildes(a.correo).includes(q) ||
            sinTildes(a.cedula).includes(q) ||
            sinTildes(a.tipo).includes(q));
    }, [accesos, busqueda]);

    // Al cambiar la búsqueda hay que volver a la primera página, si no el
    // usuario puede quedarse mirando una página que ya no existe.
    useEffect(() => { setPagina(1); }, [busqueda]);

    const totalPaginas = Math.max(1, Math.ceil(accesosFiltrados.length / POR_PAGINA));
    const paginaSegura = Math.min(pagina, totalPaginas);

    const visibles = useMemo(
        () => accesosFiltrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA),
        [accesosFiltrados, paginaSegura]
    );

    const stats = useMemo(() => {
        const hoy = new Date().toDateString();
        const entradasHoy = accesos.filter(
            (a) => a.tipo === 'entrada' && new Date(a.fecha).toDateString() === hoy
        ).length;
        const empleadosUnicos = new Set(accesos.map((a) => a.cedula || a.correo)).size;
        return { entradasHoy, empleadosUnicos, ultimo: accesos[0] };
    }, [accesos]);

    const handleExportCSV = () => {
        const filas = [['Usuario', 'Cédula', 'Correo', 'Tipo', 'Fecha'].map(campoCsv).join(',')];
        accesosFiltrados.forEach((a) => {
            filas.push([
                campoCsv(a.nombre),
                campoCsv(a.cedula),
                campoCsv(a.correo),
                campoCsv(a.tipo),
                campoCsv(new Date(a.fecha).toLocaleString('es-CO')),
            ].join(','));
        });

        // El BOM es lo que hace que Excel muestre correctamente las tildes y la
        // ñ; sin él el reporte anterior salía con caracteres corruptos.
        const contenido = `﻿${filas.join('\r\n')}`;
        const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `EntryTech_accesos_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);
        // Sin revokeObjectURL cada exportación dejaba el blob retenido en memoria.
        URL.revokeObjectURL(url);
    };

    const tarjetas = [
        { label: 'Entradas hoy', val: stats.entradasHoy, icon: <TrendingUp size={20} />, bg: '#4f46e5' },
        { label: 'Personal activo', val: stats.empleadosUnicos, icon: <Users size={20} />, bg: '#0ea5e9' },
        { label: 'Total registros', val: accesos.length, icon: <ClipboardList size={20} />, bg: '#10b981' },
        { label: 'Último', val: stats.ultimo?.nombre?.split(' ')[0] || '---', icon: <Clock size={20} />, bg: '#f59e0b' },
    ];

    return (
        <main className="main-content" id="contenido">
            <div className="pila-responsive" style={{ justifyContent: 'space-between', marginBottom: 'var(--paso-4)' }}>
                <div style={{ minWidth: 0 }}>
                    <h2 className="animate-fade-in" style={{ fontWeight: 900, letterSpacing: '-1.2px' }}>Dashboard</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                        Monitor de accesos en tiempo real
                    </p>
                </div>

                <div className="pila-responsive" style={{ gap: '0.6rem' }}>
                    <button
                        onClick={() => fetchAccesos()}
                        className="btn btn-secondary click-effect"
                        disabled={refrescando}
                        aria-label="Actualizar registros"
                    >
                        <RefreshCw size={16} style={{ animation: refrescando ? 'spin 1s linear infinite' : 'none' }} />
                        Actualizar
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="btn btn-primary click-effect"
                        disabled={accesosFiltrados.length === 0}
                    >
                        <Download size={16} /> Exportar CSV
                    </button>
                </div>
            </div>

            {error && <div className="alerta alerta-error" role="alert">{error}</div>}

            <div className="grid-auto" style={{ marginBottom: 'var(--paso-4)' }}>
                {tarjetas.map((s, i) => (
                    <div key={s.label} className={`card animate-slide-up delay-${(i % 4) * 100}`} style={{ padding: '1.25rem' }}>
                        <div style={{
                            background: `${s.bg}22`, width: '40px', height: '40px', borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: s.bg, marginBottom: '0.9rem',
                        }}>
                            {s.icon}
                        </div>
                        <div className="texto-truncado" style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', fontWeight: 900 }}>
                            {s.val}
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {s.label}
                        </div>
                    </div>
                ))}
            </div>

            <div className="animate-fade-in delay-200" style={{ position: 'relative', maxWidth: '600px', margin: '0 auto var(--paso-4)' }}>
                <span style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, display: 'flex', pointerEvents: 'none' }}>
                    <Search size={16} />
                </span>
                <label className="skip-link" htmlFor="buscador-accesos">Buscar accesos</label>
                <input
                    id="buscador-accesos"
                    type="search"
                    className="form-control"
                    placeholder="Busca por nombre, cédula, correo o tipo..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    style={{ paddingLeft: '3rem', borderRadius: '50px' }}
                />
            </div>

            <h3 style={{ fontWeight: 900, marginBottom: '1rem' }}>
                Registros recientes{' '}
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    ({accesosFiltrados.length})
                </span>
            </h3>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Cargando registros...
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {visibles.map((acc, i) => (
                            <article
                                key={acc.id}
                                className="animate-slide-up"
                                style={{
                                    animationDelay: `${Math.min(i * 40, 400)}ms`,
                                    background: 'var(--surface)',
                                    padding: 'var(--paso-2)',
                                    borderRadius: 'var(--radio-md)',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '0.75rem',
                                    // flexWrap permite que la hora baje de línea en
                                    // pantallas estrechas en vez de comprimir el nombre.
                                    flexWrap: 'wrap',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', minWidth: 0, flex: '1 1 220px' }}>
                                    <div style={{
                                        width: '44px', height: '44px', borderRadius: '14px', flexShrink: 0,
                                        background: acc.tipo === 'entrada' ? 'var(--success-bg)' : 'var(--danger-bg)',
                                        color: acc.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {acc.tipo === 'entrada' ? <LogIn size={20} /> : <LogOut size={20} />}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div className="texto-truncado" style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                                            {acc.nombre || 'Usuario desconocido'}
                                        </div>
                                        <div className="texto-truncado" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                            ID: {acc.cedula || '---'} ·{' '}
                                            <span style={{ color: acc.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)' }}>
                                                {(acc.tipo || '').toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                                        {new Date(acc.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        {new Date(acc.fecha).toLocaleDateString('es-CO')}
                                    </div>
                                </div>
                            </article>
                        ))}

                        {accesosFiltrados.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--surface)', borderRadius: 'var(--radio-lg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                                {busqueda
                                    ? <>No se encontraron resultados para <strong style={{ color: 'var(--text-main)' }}>{busqueda}</strong></>
                                    : 'Todavía no hay registros de acceso.'}
                            </div>
                        )}
                    </div>

                    {/*
                      Paginación: el wireframe la contemplaba, pero la pantalla
                      renderizaba todos los registros de golpe, lo que colgaba el
                      navegador a partir de unos pocos miles de filas.
                    */}
                    {totalPaginas > 1 && (
                        <nav className="pila-responsive" aria-label="Paginación de registros" style={{ justifyContent: 'center', marginTop: 'var(--paso-3)' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                                disabled={paginaSegura === 1}
                                style={{ width: 'auto' }}
                            >
                                Anterior
                            </button>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                                Página {paginaSegura} de {totalPaginas}
                            </span>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                                disabled={paginaSegura === totalPaginas}
                                style={{ width: 'auto' }}
                            >
                                Siguiente
                            </button>
                        </nav>
                    )}
                </>
            )}
        </main>
    );
};

export default Dashboard;
