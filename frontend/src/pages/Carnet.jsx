import React, { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';

const Carnet = () => {
    const [usuario, setUsuario] = useState(null);
    const [uploadingFoto, setUploadingFoto] = useState(false);
    const [fotoMsg, setFotoMsg] = useState('');
    const fileInputRef = useRef(null);

    useEffect(() => {
        const userData = localStorage.getItem('usuario');
        if (userData) setUsuario(JSON.parse(userData));
    }, []);

    if (!usuario || !usuario.carnet) {
        return (
            <div className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                    <p style={{ color: 'var(--text-muted)' }}>Recuperando información del carnet...</p>
                </div>
            </div>
        );
    }

    const inicial = usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : '?';

    const handleFotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setFotoMsg('❌ La imagen es muy grande. Máximo 2MB.');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result;
            setUploadingFoto(true);
            setFotoMsg('');
            try {
                await api.put(`/usuarios/${usuario.id}/foto`, { foto_url: base64 });
                const updatedUser = { ...usuario, foto_url: base64 };
                setUsuario(updatedUser);
                localStorage.setItem('usuario', JSON.stringify(updatedUser));
                setFotoMsg('✅ Foto actualizada correctamente.');
            } catch (err) {
                setFotoMsg('❌ Error al subir la foto. Intenta de nuevo.');
            } finally {
                setUploadingFoto(false);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="main-content" style={{ display: 'flex', justifyContent: 'center', paddingTop: '1rem' }}>
            <div style={{ width: '100%', maxWidth: '420px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Mi Carnet Digital</h2>

                {/* ======= CARNET PREMIUM ======= */}
                <div style={{
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 25px 60px rgba(79,70,229,0.22), 0 0 0 1px rgba(79,70,229,0.12)',
                    background: 'white',
                    marginBottom: '1.5rem'
                }}>
                    {/* Header con gradiente y foto */}
                    <div style={{
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%)',
                        padding: '2rem 1.5rem 3rem',
                        position: 'relative'
                    }}>
                        {/* Círculos decorativos */}
                        <div style={{
                            position: 'absolute', top: '-30px', right: '-30px',
                            width: '120px', height: '120px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.07)'
                        }} />
                        <div style={{
                            position: 'absolute', bottom: '-20px', left: '20px',
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.05)'
                        }} />

                        <div style={{
                            fontSize: '0.7rem', fontWeight: '700', color: 'rgba(255,255,255,0.65)',
                            letterSpacing: '0.15em', marginBottom: '1.2rem', textTransform: 'uppercase'
                        }}>
                            🏢 EntryTech — Acceso Digital
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                            {/* Avatar con foto o inicial */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                title="Clic para cambiar foto"
                                style={{
                                    width: '80px', height: '80px', borderRadius: '50%',
                                    border: '3px solid rgba(255,255,255,0.6)',
                                    overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                                    background: 'rgba(255,255,255,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    position: 'relative', transition: 'transform 0.2s',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {usuario.foto_url ? (
                                    <img src={usuario.foto_url} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: '2.2rem', fontWeight: '800', color: 'white' }}>{inicial}</span>
                                )}
                                {/* Overlay de cámara al hover */}
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: 'rgba(0,0,0,0.35)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    opacity: 0, transition: 'opacity 0.2s', borderRadius: '50%',
                                    fontSize: '1.5rem'
                                }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                                >
                                    📷
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFotoChange} />

                            <div>
                                <div style={{ color: 'white', fontSize: '1.3rem', fontWeight: '800', lineHeight: '1.2' }}>
                                    {usuario.nombre}
                                </div>
                                <div style={{ marginTop: '0.5rem' }}>
                                    <span style={{
                                        background: usuario.rol === 'admin' ? '#fbbf24' : 'rgba(255,255,255,0.2)',
                                        color: usuario.rol === 'admin' ? '#1a1a1a' : 'white',
                                        padding: '0.2rem 0.7rem', borderRadius: '20px',
                                        fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase'
                                    }}>
                                        {usuario.rol === 'admin' ? '⭐ Administrador' : '👤 Usuario'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Info con chips */}
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #f0f4f8' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Correo</div>
                                <div style={{ fontSize: '0.82rem', fontWeight: '600', marginTop: '0.25rem', wordBreak: 'break-all' }}>{usuario.correo}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Estado</div>
                                <div style={{ marginTop: '0.25rem' }}>
                                    <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' }}>
                                        ● Activo
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mensaje de subida */}
                    {(fotoMsg || uploadingFoto) && (
                        <div style={{ padding: '0.6rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: '600',
                            background: fotoMsg.startsWith('✅') ? '#d1fae5' : fotoMsg.startsWith('❌') ? '#fee2e2' : '#f0f4ff',
                            color: fotoMsg.startsWith('✅') ? '#065f46' : fotoMsg.startsWith('❌') ? '#991b1b' : '#4f46e5'
                        }}>
                            {uploadingFoto ? '⏳ Subiendo foto...' : fotoMsg}
                        </div>
                    )}

                    {/* QR Code */}
                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            padding: '1rem', background: 'white', borderRadius: '16px',
                            boxShadow: '0 4px 20px rgba(79,70,229,0.12)',
                            border: '2px solid rgba(79,70,229,0.1)'
                        }}>
                            <QRCodeSVG value={usuario.carnet.codigo_qr} size={190} />
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                            Muestra este código en el lector de acceso
                        </p>
                    </div>

                    {/* Footer */}
                    <div style={{
                        background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                        padding: '0.85rem 1.5rem',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '0.08em' }}>
                            SISTEMA DE ACCESO — ENTRYTECH
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>🔒 Seguro</span>
                    </div>
                </div>

                {/* Botón cambiar foto */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-secondary btn-block"
                    disabled={uploadingFoto}
                    style={{ marginBottom: '1rem', padding: '0.9rem' }}
                >
                    {uploadingFoto ? '⏳ Subiendo...' : '📷 Cambiar Foto de Perfil'}
                </button>

                {/* Botón NFC */}
                <button
                    onClick={async () => {
                        if (!('NDEFReader' in window)) {
                            alert('Tu navegador no soporta Web NFC. Usa Google Chrome en Android con NFC encendido.');
                            return;
                        }
                        try {
                            const ndef = new NDEFReader();
                            await ndef.write({ records: [{ recordType: "text", data: usuario.carnet.codigo_nfc }] });
                            alert("¡Transmisión NFC exitosa!");
                        } catch (error) {
                            alert(`Error de NFC: ${error.message}`);
                        }
                    }}
                    className="btn btn-primary btn-block"
                    style={{ padding: '0.9rem', fontSize: '1rem' }}
                >
                    📡 Transmitir por NFC
                </button>
            </div>
        </div>
    );
};

export default Carnet;
