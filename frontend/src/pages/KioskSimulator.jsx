import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';
import api from '../services/api';

const KioskSimulator = () => {
    const [resultado, setResultado] = useState(null);
    const [loading, setLoading] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const scannerRef = useRef(null);

    // Al salir del componente, apagar cámara si estaba activa
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(() => {});
                scannerRef.current = null;
            }
        };
    }, []);

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
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
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
                fps: 20, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0 
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                async (decodedText) => {
                    if (loading || resultado) return;
                    
                    setLoading(true);
                    
                    try {
                        // 1. APAGAR CÁMARA PARA SIEMPRE (en esta sesión)
                        if (scannerRef.current) {
                            await scannerRef.current.stop().catch(() => {});
                            scannerRef.current = null;
                        }
                        setCameraActive(false);

                        const res = await api.post('/acceso', { codigo: decodedText });
                        
                        playSound('exito');
                        if (navigator.vibrate) navigator.vibrate(100);

                        setResultado({ 
                            exito: true, 
                            mensaje: res.data.mensaje, 
                            tipo: res.data.tipo,
                            nombre: res.data.usuario?.nombre || 'Usuario'
                        });

                        // El resultado se queda 4 segundos para que se vea bien
                        setTimeout(() => {
                            setResultado(null);
                            setLoading(false);
                        }, 4000);

                    } catch (error) {
                        playSound('error');
                        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

                        setResultado({
                            exito: false,
                            mensaje: error.response?.data?.mensaje || 'Acceso Denegado'
                        });

                        // Si falla, también apagamos para seguridad, o podrías dejarla encendida.
                        // Por tu petición, la apagaremos siempre tras un intento serio.
                        setTimeout(() => {
                            setResultado(null);
                            setLoading(false);
                        }, 4000);
                    }
                },
                () => {}
            );

            setCameraActive(true);
        } catch (err) {
            console.error("Error de cámara:", err);
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
        <div className="main-content" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>Terminal de Acceso</h1>
                <p style={{ color: 'var(--text-muted)' }}>Simulador de Lector Inteligente EntryTech</p>
            </div>

            <div style={{ position: 'relative', borderRadius: '30px', overflow: 'hidden', background: '#1a1a1a', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', border: '4px solid #2d2d2d' }}>
                
                {/* Pantalla del Escáner */}
                <div id="reader" style={{ width: '100%', minHeight: '400px', background: '#000' }}></div>

                {/* Overlays de Estado */}
                {!cameraActive && !resultado && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', color: 'white', zIndex: 10 }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>📷</div>
                        <h3 style={{ marginBottom: '1.5rem' }}>Sistema en Espera</h3>
                        <button onClick={handleStartCamera} className="btn btn-primary" style={{ padding: '1rem 2.5rem', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 'bold', boxShadow: '0 0 20px rgba(79,70,229,0.5)' }}>
                            Activar Escáner
                        </button>
                    </div>
                )}

                {/* Overlay de Resultado (Animado) */}
                {resultado && (
                    <div style={{
                        position: 'absolute', inset: 0, 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        background: resultado.exito 
                            ? (resultado.tipo === 'entrada' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(59, 130, 246, 0.95)')
                            : 'rgba(239, 68, 68, 0.95)',
                        color: 'white', zIndex: 20,
                        animation: 'fadeIn 0.3s ease-out'
                    }}>
                        <div style={{ fontSize: '6rem', marginBottom: '1rem', animation: 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                            {resultado.exito ? (resultado.tipo === 'entrada' ? '✅' : '🚪') : '❌'}
                        </div>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                            {resultado.exito ? (resultado.tipo === 'entrada' ? 'ENTRADA' : 'SALIDA') : 'DENEGADO'}
                        </h2>
                        <p style={{ fontSize: '1.5rem', fontWeight: '500', opacity: 0.9 }}>
                            {resultado.mensaje}
                        </p>
                        {resultado.nombre && (
                            <div style={{ marginTop: '2rem', padding: '0.5rem 2rem', background: 'rgba(255,255,255,0.2)', borderRadius: '50px', fontSize: '1.2rem', fontWeight: '700' }}>
                                {resultado.nombre}
                            </div>
                        )}
                    </div>
                )}

                {/* Línea de escaneo animada */}
                {cameraActive && !resultado && (
                    <div style={{
                        position: 'absolute', top: '0', left: '0', width: '100%', height: '4px',
                        background: 'linear-gradient(to right, transparent, var(--primary-color), transparent)',
                        boxShadow: '0 0 15px var(--primary-color)',
                        zIndex: 5,
                        animation: 'scanMove 2s infinite linear'
                    }}></div>
                )}
            </div>

            {/* Controles Inferiores */}
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                {cameraActive && (
                    <button onClick={handleStopCamera} className="btn btn-secondary" style={{ flex: 1, padding: '1rem', borderRadius: '15px', fontWeight: '700' }}>
                        ⏹ Detener Sistema
                    </button>
                )}
                <button onClick={() => alert('NFC se activa al acercar tarjeta en dispositivos compatibles')} className="btn btn-primary" style={{ flex: 1, padding: '1rem', borderRadius: '15px', fontWeight: '700', background: 'var(--secondary)' }}>
                    📡 Modo NFC
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

