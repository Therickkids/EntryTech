import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';

const Dashboard = () => {
    const [accesos, setAccesos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    useEffect(() => {
        const fetchAccesos = async () => {
            try {
                const res = await api.get('/accesos');
                setAccesos(res.data);
            } catch (error) {
                console.error("Error cargando accesos:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAccesos();
    }, []);

    // Estadísticas calculadas
    const stats = useMemo(() => {
        const hoy = new Date().toDateString();
        const entradasHoy = accesos.filter(a =>
            a.tipo === 'entrada' && new Date(a.fecha).toDateString() === hoy
        ).length;
        const empleadosUnicos = new Set(accesos.map(a => a.correo)).size;
        const ultimo = accesos[accesos.length - 1];
        return { entradasHoy, empleadosUnicos, ultimo };
    }, [accesos]);

    // Filtrado por búsqueda
    const accesosFiltrados = useMemo(() => {
        if (!busqueda.trim()) return accesos;
        const q = busqueda.toLowerCase();
        return accesos.filter(a =>
            a.nombre?.toLowerCase().includes(q) ||
            a.correo?.toLowerCase().includes(q) ||
            a.tipo?.toLowerCase().includes(q)
        );
    }, [accesos, busqueda]);

    const handleExportCSV = () => {
        const csvRows = [['Usuario', 'Correo', 'Tipo de Evento', 'Fecha y Hora'].join(',')];
        for (const acc of accesosFiltrados) {
            csvRows.push([`"${acc.nombre}"`, `"${acc.correo}"`, `"${acc.tipo}"`, `"${new Date(acc.fecha).toLocaleString()}"`].join(','));
        }
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'reporte_accesos.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const statCards = [
        { label: 'Entradas Hoy', value: stats.entradasHoy, icon: '🚀', color: '#4f46e5' },
        { label: 'Empleados Registrados', value: stats.empleadosUnicos, icon: '👥', color: '#0ea5e9' },
        { label: 'Total Registros', value: accesos.length, icon: '📋', color: '#10b981' },
        { label: 'Último Acceso', value: stats.ultimo ? stats.ultimo.nombre?.split(' ')[0] : '—', icon: '⏱️', color: '#f59e0b' },
    ];

    return (
        <div className="main-content" style={{ paddingBottom: '5rem' }}>
            <div style={{ 
                display: 'flex', 
                flexDirection: window.innerWidth < 600 ? 'column' : 'row',
                justifyContent: 'space-between', 
                alignItems: window.innerWidth < 600 ? 'flex-start' : 'center', 
                marginBottom: '2rem',
                gap: '1rem'
            }}>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: '900', letterSpacing: '-1px' }}>Dashboard</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Control total de accesos EntryTech</p>
                </div>
                <button onClick={handleExportCSV} className="btn btn-primary" style={{ borderRadius: '12px', padding: '0.6rem 1.2rem' }}>
                    ⬇ Exportar Reporte
                </button>
            </div>

            {/* Tarjetas de estadísticas - Grid optimizado */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
                gap: '1rem', 
                marginBottom: '2.5rem' 
            }}>
                {statCards.map((s, i) => (
                    <div key={i} className="card" style={{ 
                        padding: '1rem', 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'flex-start', 
                        gap: '0.5rem', 
                        border: 'none',
                        background: 'white',
                        boxShadow: 'var(--shadow-md)',
                        borderRadius: '20px'
                    }}>
                        <div style={{ 
                            background: `${s.color}20`, 
                            width: '40px', height: '40px', 
                            borderRadius: '12px', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.2rem'
                        }}>
                            {s.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#1a1a1a' }}>{s.value}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Buscador Premium */}
            <div style={{ 
                marginBottom: '2rem', 
                position: 'relative', 
                maxWidth: '600px', 
                margin: '0 auto 2.5rem auto' 
            }}>
                <div style={{
                    position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)',
                    fontSize: '1.1rem', opacity: 0.5
                }}>🔍</div>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar por nombre o correo..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    style={{ 
                        paddingLeft: '3.2rem', height: '52px', borderRadius: '50px', 
                        border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
                        fontSize: '0.95rem'
                    }}
                />
            </div>

            {/* Lista de Registros - Optimizada para Móvil */}
            <div className="card" style={{ padding: '0', overflow: 'hidden', background: 'transparent', boxShadow: 'none', border: 'none' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '800' }}>Registros Recientes</h3>
                
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>⏳ Cargando...</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {accesosFiltrados.map((acc) => (
                            <div key={acc.id} style={{
                                background: 'white',
                                padding: '1rem',
                                borderRadius: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: 'var(--shadow-sm)',
                                border: '1px solid rgba(0,0,0,0.03)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ 
                                        width: '40px', height: '40px', borderRadius: '50%', 
                                        background: acc.tipo === 'entrada' ? '#d1fae5' : '#fee2e2',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.2rem',
                                        color: acc.tipo === 'entrada' ? '#059669' : '#dc2626'
                                    }}>
                                        👤
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>{acc.nombre}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {new Date(acc.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {acc.tipo.toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                    {new Date(acc.fecha).toLocaleDateString()}
                                </div>
                            </div>
                        ))}

                        {accesosFiltrados.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                No se encontraron registros.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;

