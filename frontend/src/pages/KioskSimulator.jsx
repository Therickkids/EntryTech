import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';
import api from '../services/api';
import { Camera, Square, Wifi, Zap } from 'lucide-react';

const KioskSimulator = () => {
    const [resultado, setResultado] = useState(null);
    const [loading, setLoading] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const scannerRef = useRef(null);

    // (El cleanup de la cámara ha sido optimizado y unificado en un solo useEffect más abajo)

    // Sonido de Caja Registradora / Check-in Pro
    const playSound = (tipo) => {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        if (tipo === 'exito') {
            // Sonido tipo "Ding" doble (Caja registradora)
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc1.type = 'sine';
            osc2.type = 'sine';
            osc1.frequency.setValueAtTime(987.77, audioCtx.currentTime); // Si5
            osc2.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.05); // Mi6

            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(audioCtx.destination);

            osc1.start();
            osc2.start();
            osc1.stop(audioCtx.currentTime + 0.5);
            osc2.stop(audioCtx.currentTime + 0.5);
        } else {
            // Sonido de Error (Buzzer bajo)
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(110, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        }
    };

    // Auto-encendido al entrar al apartado
    useEffect(() => {
        handleStartCamera();
        
        return () => {
            // Un solo bloque de cleanup robusto para evitar colisiones entre stop() y clear()
            if (scannerRef.current) {
                const scanner = scannerRef.current;
                scannerRef.current = null; // Anular inmediatamente para evitar ejecuciones duplicadas
                
                try {
                    scanner.stop().then(() => {
                        try { scanner.clear(); } catch(e) {}
                    }).catch(() => {
                        try { scanner.clear(); } catch(e) {}
                    });
                } catch (e) {
                    try { scanner.clear(); } catch(e) {}
                }
            }
        };
    }, []);

    const handleStartCamera = async () => {
        if (cameraActive) return;

        try {
            // Limpiar cualquier residuo previo
            const readerEl = document.getElementById('reader');
            if (readerEl) readerEl.innerHTML = '';

            const html5QrCode = new Html5Qrcode("reader");
            scannerRef.current = html5QrCode;

            const config = { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0 
            };

            const onScanSuccess = async (decodedText) => {
                if (loading || resultado) return;
                
                setLoading(true);
                
                try {
                    // 1. PAUSAR LECTURAS
                    if (scannerRef.current) {
                        scannerRef.current.pause(true);
                    }

                    const res = await api.post('/acceso', { codigo: decodedText });
                    
                    playSound('exito');
                    if (navigator.vibrate) navigator.vibrate(100);

                    setResultado({ 
                        exito: true, 
                        mensaje: res.data.mensaje, 
                        tipo: res.data.tipo,
                        nombre: res.data.usuario?.nombre || 'Usuario'
                    });

                    // 2. ESPERAR Y APAGAR CÁMARA TRAS EL MENSAJE
                    setTimeout(async () => {
                        setResultado(null);
                        setLoading(false);
                        
                        if (scannerRef.current) {
                            await scannerRef.current.stop().catch(() => {});
                            scannerRef.current = null;
                        }
                        setCameraActive(false);
                    }, 4000);

                } catch (error) {
                    playSound('error');
                    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

                    setResultado({
                        exito: false,
                        mensaje: error.response?.data?.mensaje || 'Acceso Denegado'
                    });

                    setTimeout(async () => {
                        setResultado(null);
                        setLoading(false);
                        
                        if (scannerRef.current) {
                            await scannerRef.current.stop().catch(() => {});
                            scannerRef.current = null;
                        }
                        setCameraActive(false);
                    }, 4000);
                }
            };

            // Intentar cámara trasera primero, si falla (ej. PC) usar cámara frontal
            try {
                await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, () => {});
            } catch (envError) {
                console.warn("Cámara trasera falló, intentando frontal...", envError);
                await html5QrCode.start({ facingMode: "user" }, config, onScanSuccess, () => {});
            }

            setCameraActive(true);
        } catch (err) {
            console.error("Error de cámara:", err);
            alert("No se pudo iniciar la cámara. Verifica los permisos de tu navegador.");
        }
    };

    const handleStopCamera = async () => {
        if (scannerRef.current) {
            try { await scannerRef.current.stop(); } catch (e) {}
            scannerRef.current = null;
        }
        const readerEl = document.getElementById('reader');
        if (readerEl) readerEl.innerHTML = '';
        setCameraActive(false);
        setResultado(null);
    };

    return (
        <div className="main-content animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '5rem' }}>
            <div className="animate-slide-up" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px', padding: '0.3rem 1rem', marginBottom: '1rem' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
                    <span style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sistema Activo</span>
                </div>
                <h1 style={{ fontSize: '2.2rem', fontWeight: '900', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', letterSpacing: '-0.05em' }}>Terminal de Acceso</h1>
                <p style={{ color: 'var(--text-muted)' }}>Simulador de Lector Inteligente EntryTech</p>
            </div>

            <div className="animate-scale-in" style={{ position: 'relative', borderRadius: '30px', overflow: 'hidden', background: '#050505', boxShadow: '0 0 0 1px rgba(99,102,241,0.2), 0 30px 80px rgba(0,0,0,0.6)', border: '1px solid rgba(99,102,241,0.15)' }}>
                {/* Grid ciberpúntico de fondo */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 1, opacity: 0.06,
                    backgroundImage: 'linear-gradient(var(--success) 1px, transparent 1px), linear-gradient(90deg, var(--success) 1px, transparent 1px)',
                    backgroundSize: '30px 30px', pointerEvents: 'none'
                }} />
                {/* Pantalla del Escáner */}
                <div id="reader" style={{ width: '100%', minHeight: '400px', background: '#000', position: 'relative', zIndex: 2 }}></div>

                {/* Overlays de Estado */}
                {!cameraActive && !resultado && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', color: 'white', zIndex: 10 }}>
                        <div style={{ marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.8))', color: 'rgba(99,102,241,0.9)' }}><Camera size={64} /></div>
                        <h3 style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em' }}>Sistema en Espera</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Apunta la cámara al código QR</p>
                        <button onClick={handleStartCamera} className="btn btn-primary click-effect" style={{ padding: '1rem 2.5rem', borderRadius: '50px', fontSize: '1rem', fontWeight: '700', boxShadow: '0 0 30px rgba(99,102,241,0.5)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Zap size={18} /> Activar Escáner
                        </button>
                    </div>
                )}

                {/* Overlay de Resultado (Animado) */}
                {resultado && (
                    <div style={{
                        position: 'absolute', inset: 0, 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: resultado.exito 
                            ? (resultado.tipo === 'entrada' 
                                ? 'linear-gradient(135deg, rgba(5,150,105,0.97), rgba(16,185,129,0.97))'
                                : 'linear-gradient(135deg, rgba(37,99,235,0.97), rgba(14,165,233,0.97))')
                            : 'linear-gradient(135deg, rgba(185,28,28,0.97), rgba(239,68,68,0.97))',
                        color: 'white', zIndex: 20,
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        {/* Efecto de luz de fondo */}
                        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
                        <div style={{ fontSize: '7rem', marginBottom: '0.5rem', animation: 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.5))' }}>
                            {resultado.exito ? (resultado.tipo === 'entrada' ? '✅' : '🚪') : '❌'}
                        </div>
                        <h2 style={{ fontSize: '3rem', fontWeight: '900', marginBottom: '0.25rem', letterSpacing: '-0.05em', fontFamily: 'var(--font-heading)', textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
                            {resultado.exito ? (resultado.tipo === 'entrada' ? 'ENTRADA' : 'SALIDA') : 'DENEGADO'}
                        </h2>
                        <p style={{ fontSize: '1.1rem', fontWeight: '500', opacity: 0.9, letterSpacing: '0.02em' }}>
                            {resultado.mensaje}
                        </p>
                        {resultado.nombre && (
                            <div style={{ marginTop: '1.5rem', padding: '0.6rem 2rem', background: 'rgba(255,255,255,0.2)', borderRadius: '50px', fontSize: '1.1rem', fontWeight: '700', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.3)' }}>
                                👤 {resultado.nombre}
                            </div>
                        )}
                    </div>
                )}

                {/* Línea de escaneo animada */}
                {cameraActive && !resultado && (
                    <div style={{
                        position: 'absolute', top: '0', left: '0', width: '100%', height: '3px',
                        background: 'linear-gradient(90deg, transparent 0%, var(--success) 50%, transparent 100%)',
                        boxShadow: '0 0 20px var(--success), 0 0 40px var(--success)',
                        zIndex: 5,
                        animation: 'scanMove 2.5s ease-in-out infinite'
                    }}></div>
                )}
            </div>

            {/* Controles Inferiores */}
            <div className="animate-slide-up delay-200" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                {cameraActive && (
                <button onClick={handleStopCamera} className="btn btn-secondary click-effect" style={{ flex: 1, padding: '1rem', borderRadius: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Square size={16} /> Detener Sistema
                    </button>
                )}
                <button onClick={() => alert('NFC se activa al acercar tarjeta en dispositivos compatibles')} className="btn btn-primary click-effect" style={{ flex: 1, padding: '1rem', borderRadius: '20px', fontWeight: '700', background: 'linear-gradient(135deg, var(--secondary), #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Wifi size={18} /> Modo NFC
                </button>
            </div>

            <style>{`
                @keyframes scanMove {
                    0% { top: 20%; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 80%; opacity: 0; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes bounceIn {
                    0% { transform: scale(0.3); opacity: 0; }
                    50% { transform: scale(1.05); opacity: 1; }
                    70% { transform: scale(0.9); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default KioskSimulator;

