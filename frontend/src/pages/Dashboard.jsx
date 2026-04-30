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
        <div className="main-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>Dashboard de Accesos</h2>
                <button onClick={handleExportCSV} className="btn btn-primary">⬇ Exportar CSV</button>
            </div>

            {/* Tarjetas de estadísticas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {statCards.map((s, i) => (
                    <div key={i} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: `4px solid ${s.color}` }}>
                        <span style={{ fontSize: '2rem' }}>{s.icon}</span>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '500' }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Buscador */}
            <div style={{ marginBottom: '1rem' }}>
                <input
                    type="text"
                    className="form-control"
                    placeholder="🔍 Buscar por nombre, correo o tipo..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    style={{ maxWidth: '400px' }}
                />
            </div>

            <div className="card">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
                        <p>Cargando registros...</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Usuario</th>
                                    <th>Correo</th>
                                    <th>Tipo de Evento</th>
                                    <th>Fecha y Hora</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accesosFiltrados.map((acc) => (
                                    <tr key={acc.id}>
                                        <td><strong>{acc.nombre}</strong></td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{acc.correo}</td>
                                        <td>
                                            <span className={`badge ${acc.tipo === 'entrada' ? 'badge-entrada' : 'badge-salida'}`}>
                                                {acc.tipo === 'entrada' ? '🚀 ENTRADA' : '🚪 SALIDA'}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.9rem' }}>{new Date(acc.fecha).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {accesosFiltrados.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                            {busqueda ? '🔍 No se encontraron resultados.' : 'No hay registros disponibles.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;

