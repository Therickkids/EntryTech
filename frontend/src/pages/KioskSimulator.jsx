import React, { useState, useRef, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
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

    const handleStartCamera = () => {
        if (cameraActive) return;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setResultado({
                exito: false,
                mensaje: '⚠️ Tu navegador no permite acceso a la cámara. Usa Safari en iPhone o Chrome en Android.'
            });
            return;
        }

        // Crear el escáner directamente
        const scanner = new Html5QrcodeScanner(
            "reader",
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                rememberLastUsedCamera: true,
                showTorchButtonIfSupported: true
            },
            false
        );
        
        scannerRef.current = scanner;

        scanner.render(async (decodedText) => {
            if (loading) return;
            setLoading(true);
            setResultado(null);
            
            try {
                // Detener escaneo mientras procesamos
                scanner.pause(true);
                
                const res = await api.post('/acceso', { codigo: decodedText });
                setResultado({ exito: true, mensaje: res.data.mensaje, tipo: res.data.tipo });
                
                // Si fue éxito, apagamos la cámara
                setTimeout(() => handleStopCamera(), 2000);
            } catch (error) {
                setResultado({
                    exito: false,
                    mensaje: error.response?.data?.mensaje || 'Error de conexión o código inválido.'
                });
                setTimeout(() => {
                    setResultado(null);
                    if (scannerRef.current) scanner.resume();
                }, 3000);
            } finally {
                setLoading(false);
            }
        }, (error) => {
            // Errores silenciosos de escaneo (no encontró QR en el frame)
        });

        // PARCHE PARA IPHONE: Forzar playsinline en el video que crea la librería
        setTimeout(() => {
            const video = document.querySelector('#reader video');
            if (video) {
                video.setAttribute('playsinline', 'true');
                video.setAttribute('muted', 'true');
                video.play().catch(() => {});
            }
        }, 1000);

        setCameraActive(true);
    };

    const handleStopCamera = async () => {
        // 1. Destruir el escáner de la librería
        if (scannerRef.current) {
            try {
                await scannerRef.current.clear();
            } catch (e) {}
            scannerRef.current = null;
        }

        // 2. FORZAR apagado del hardware: parar todos los tracks de video activos
        try {
            const videos = document.querySelectorAll('video');
            videos.forEach(video => {
                if (video.srcObject) {
                    video.srcObject.getTracks().forEach(track => track.stop());
                    video.srcObject = null;
                }
            });
        } catch (e) {}

        // 3. Limpiar el contenedor del DOM
        const readerEl = document.getElementById('reader');
        if (readerEl) readerEl.innerHTML = '';

        setCameraActive(false);
    };

    const handleNfcScan = async () => {
        if (!('NDEFReader' in window)) {
            alert('NFC no está soportado en este navegador o dispositivo. Usa Chrome en Android y asegúrate de tener NFC activado.');
            return;
        }
        try {
            const ndef = new NDEFReader();
            await ndef.scan();
            setResultado({ exito: true, mensaje: "Acerca una tarjeta NFC al lector..." });
            ndef.onreadingerror = () => setResultado({ exito: false, mensaje: "Error al leer la tarjeta NFC. Intenta de nuevo." });
            ndef.onreading = async (event) => {
                setLoading(true);
                setResultado(null);
                try {
                    let nfcText = '';
                    for (const record of event.message.records) {
                        nfcText = new TextDecoder(record.encoding).decode(record.data);
                        break;
                    }
                    if (!nfcText) throw new Error("Tarjeta NFC vacía o formato no válido");
                    const res = await api.post('/acceso', { codigo: nfcText });
                    setResultado({ exito: true, mensaje: res.data.mensaje, tipo: res.data.tipo });
                } catch (error) {
                    setResultado({ exito: false, mensaje: error.response?.data?.mensaje || 'Error de conexión o código NFC inválido.' });
                } finally {
                    setLoading(false);
                    setTimeout(() => setResultado(null), 3000);
                }
            };
        } catch (error) {
            setResultado({ exito: false, mensaje: `Error al iniciar NFC: ${error.message}` });
        }
    };

    return (
        <div className="main-content">
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Simulador de Lector (Torniquete)</h2>
            <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                    Para probar <strong>NFC</strong>, pulsa el botón y acerca una tarjeta física al celular. 
                    Para <strong>QR</strong>, muestra el código QR de otro dispositivo a la cámara.
                </p>

                <button onClick={handleNfcScan} className="btn btn-primary btn-block" style={{ marginBottom: '1.5rem', padding: '1rem', fontSize: '1.1rem' }}>
                    📡 Activar Lector NFC
                </button>

                {/* Botón de encender cámara - solo visible cuando está apagada */}
                {!cameraActive && (
                    <button
                        onClick={handleStartCamera}
                        className="btn btn-primary btn-block"
                        style={{ marginBottom: '1rem', padding: '1rem', fontSize: '1.1rem' }}
                    >
                        📷 Encender Cámara QR
                    </button>
                )}

                {/* Contenedor del escáner - siempre en el DOM pero vacío cuando está apagado */}
                <div id="reader" style={{ width: '100%', marginBottom: cameraActive ? '1rem' : '0' }}></div>

                {/* Botón de apagar - solo visible cuando está encendida */}
                {cameraActive && (
                    <button
                        onClick={handleStopCamera}
                        className="btn btn-danger btn-block"
                        style={{ marginBottom: '1.5rem', padding: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }}
                    >
                        ⏹ Apagar Cámara
                    </button>
                )}

                {loading && (
                    <div style={{ textAlign: 'center', marginTop: '1rem', fontWeight: 'bold' }}>
                        Procesando acceso...
                    </div>
                )}

                {resultado && (
                    <div style={{
                        marginTop: '2rem',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        backgroundColor: resultado.exito ? '#d1fae5' : '#fee2e2',
                        color: resultado.exito ? '#065f46' : '#991b1b',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                    }}>
                        <span>{resultado.mensaje}</span>
                        <button
                            onClick={() => setResultado(null)}
                            className="btn btn-secondary btn-sm"
                            style={{ backgroundColor: 'white', border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                        >
                            Cerrar Mensaje
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KioskSimulator;

