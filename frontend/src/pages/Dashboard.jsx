import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';

const Dashboard = () => {
    const [accesos, setAccesos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    const fetchAccesos = async () => {
        try {
            const res = await api.get('/accesos');
            setAccesos(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error cargando accesos:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccesos();
        // Recargar cada 30 segundos para ver nuevos registros
        const interval = setInterval(fetchAccesos, 30000);
        return () => clearInterval(interval);
    }, []);

    // Motor de búsqueda ultra-robusto
    const accesosFiltrados = useMemo(() => {
        const q = busqueda.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (!q) return accesos;

        return accesos.filter(a => {
            const dataString = `${a.nombre} ${a.correo} ${a.cedula} ${a.tipo}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return dataString.includes(q);
        });
    }, [accesos, busqueda]);

    const stats = useMemo(() => {
        const hoy = new Date().toDateString();
        const entradasHoy = accesos.filter(a =>
            a.tipo === 'entrada' && new Date(a.fecha).toDateString() === hoy
        ).length;
        const empleadosUnicos = new Set(accesos.map(a => a.cedula || a.correo)).size;
        const ultimo = accesos[0]; // Ya vienen ordenados por fecha DESC del backend
        return { entradasHoy, empleadosUnicos, ultimo };
    }, [accesos]);

    const handleExportCSV = () => {
        const csvRows = [['Usuario', 'Cédula', 'Tipo', 'Fecha'].join(',')];
        accesosFiltrados.forEach(a => {
            csvRows.push([`"${a.nombre}"`, `"${a.cedula}"`, `"${a.tipo}"`, `"${new Date(a.fecha).toLocaleString()}"`].join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `Reporte_${new Date().toLocaleDateString()}.csv`; link.click();
    };

    return (
        <div className="main-content" style={{ paddingBottom: '4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-1.2px' }}>Dashboard</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Monitor de accesos en tiempo real</p>
                </div>
                <button onClick={handleExportCSV} className="btn btn-primary" style={{ padding: '0.7rem 1.5rem', borderRadius: '14px' }}>
                    ⬇ Exportar CSV
                </button>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                {[
                    { label: 'Entradas Hoy', val: stats.entradasHoy, icon: '🚀', bg: '#4f46e5' },
                    { label: 'Personal Activo', val: stats.empleadosUnicos, icon: '👥', bg: '#0ea5e9' },
                    { label: 'Total Logs', val: accesos.length, icon: '📋', bg: '#10b981' },
                    { label: 'Último', val: stats.ultimo?.nombre?.split(' ')[0] || '---', icon: '⏱️', bg: '#f59e0b' }
                ].map((s, i) => (
                    <div key={i} className="card" style={{ padding: '1.25rem', borderRadius: '24px', border: 'none', boxShadow: 'var(--shadow-md)' }}>
                        <div style={{ background: `${s.bg}15`, width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '1rem' }}>{s.icon}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{s.val}</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Buscador de "Fuerza Bruta" */}
            <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto 2.5rem auto' }}>
                <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                <input
                    type="text"
                    className="form-control"
                    placeholder="Busca por nombre, cédula o tipo..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    style={{ paddingLeft: '3.2rem', height: '55px', borderRadius: '50px', border: '1.5px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
                />
            </div>

            <div className="card" style={{ padding: '0', background: 'transparent', boxShadow: 'none', border: 'none' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', marginBottom: '1.5rem' }}>Registros Recientes</h3>
                
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando registros...</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {accesosFiltrados.map((acc) => (
                            <div key={acc.id} style={{ background: 'white', padding: '1.2rem', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(0,0,0,0.03)', boxShadow: 'var(--shadow-sm)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '45px', height: '45px', borderRadius: '14px', background: acc.tipo === 'entrada' ? '#ecfdf5' : '#fef2f2', color: acc.tipo === 'entrada' ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>👤</div>
                                    <div>
                                        <div style={{ fontWeight: '900', fontSize: '1rem', color: 'var(--text-main)' }}>{acc.nombre}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                                            ID: {acc.cedula} • <span style={{ color: acc.tipo === 'entrada' ? '#059669' : '#dc2626' }}>{acc.tipo.toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>{new Date(acc.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>{new Date(acc.fecha).toLocaleDateString()}</div>
                                </div>
                            </div>
                        ))}
                        {accesosFiltrados.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '4rem', background: 'white', borderRadius: '24px', color: 'var(--text-muted)' }}>
                                🔍 No se encontraron resultados para "<strong>{busqueda}</strong>"
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
