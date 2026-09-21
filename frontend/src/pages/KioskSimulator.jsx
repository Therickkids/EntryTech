import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Square, Wifi, Zap, Keyboard } from 'lucide-react';
import api, { mensajeDeError } from '../services/api';

const MS_RESULTADO = 4000;

const KioskSimulator = () => {
    const [resultado, setResultado] = useState(null);
    const [procesando, setProcesando] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [errorCamara, setErrorCamara] = useState(null);
    const [codigoManual, setCodigoManual] = useState('');

    const scannerRef = useRef(null);
    const audioCtxRef = useRef(null);
    const temporizadorRef = useRef(null);

    /*
      El callback de html5-qrcode se registra una sola vez, así que cualquier
      variable de estado que lea queda congelada en el valor del primer render.
      La versión anterior comprobaba `if (loading || resultado) return;` con
      valores que siempre eran false, de modo que un QR enfocado durante un
      segundo disparaba diez peticiones seguidas al backend. Con un ref el
      cerrojo sí refleja el estado actual.
    */
    const bloqueadoRef = useRef(false);

    /*
      Un único AudioContext reutilizado. Antes se creaba uno nuevo en cada
      escaneo y nunca se cerraba: los navegadores limitan el número de contextos
      simultáneos (seis en Chrome) y tras varias lecturas el sonido dejaba de
      funcionar.
    */
    const obtenerAudioCtx = () => {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new Ctx();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume().catch(() => {});
        }
        return audioCtxRef.current;
    };

    const reproducirSonido = (tipo) => {
        const ctx = obtenerAudioCtx();
        if (!ctx) return;

        const gain = ctx.createGain();
        gain.connect(ctx.destination);

        if (tipo === 'exito') {
            [987.77, 1318.51].forEach((frecuencia, i) => {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(frecuencia, ctx.currentTime + i * 0.05);
                osc.connect(gain);
                osc.start(ctx.currentTime + i * 0.05);
                osc.stop(ctx.currentTime + 0.5);
            });
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        } else {
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(110, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
            osc.connect(gain);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        }
    };

    const detenerCamara = useCallback(async () => {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        if (!scanner) return;
        try {
            await scanner.stop();
        } catch {
            /* La cámara ya estaba detenida. */
        }
        try {
            scanner.clear();
        } catch {
            /* El nodo ya fue desmontado. */
        }
    }, []);

    /** Envía el código al backend. Lo comparten el escáner y el campo manual. */
    const registrarAcceso = useCallback(async (codigo, { pausarEscaner = false } = {}) => {
        if (bloqueadoRef.current) return;
        bloqueadoRef.current = true;
        setProcesando(true);

        if (pausarEscaner && scannerRef.current) {
            try { scannerRef.current.pause(true); } catch { /* ignorado */ }
        }

        try {
            const res = await api.post('/acceso', { codigo });
            reproducirSonido('exito');
            if (navigator.vibrate) navigator.vibrate(100);

            setResultado({
                exito: true,
                mensaje: res.data.mensaje,
                tipo: res.data.tipo,
                // El backend ya devuelve el objeto `usuario`; antes lo omitía y
                // esta pantalla mostraba siempre el texto genérico "Usuario".
                nombre: res.data.usuario?.nombre || '',
            });
        } catch (error) {
            reproducirSonido('error');
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            setResultado({
                exito: false,
                mensaje: mensajeDeError(error, 'Acceso denegado.'),
            });
        } finally {
            temporizadorRef.current = setTimeout(async () => {
                setResultado(null);
                setProcesando(false);
                bloqueadoRef.current = false;
                await detenerCamara();
                setCameraActive(false);
            }, MS_RESULTADO);
        }
    }, [detenerCamara]);

    const iniciarCamara = useCallback(async () => {
        if (scannerRef.current) return;
        setErrorCamara(null);

        // La API getUserMedia solo existe en contextos seguros: HTTPS o
        // localhost. Antes el fallo se mostraba como un alert genérico de
        // "verifica los permisos", que despistaba en la red local por HTTP.
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
            setErrorCamara('La cámara requiere una conexión segura (HTTPS) o localhost. Usa el ingreso manual del código.');
            return;
        }

        try {
            const nodo = document.getElementById('reader');
            if (nodo) nodo.innerHTML = '';

            const escaner = new Html5Qrcode('reader');
            scannerRef.current = escaner;

            const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
            const alLeer = (texto) => registrarAcceso(texto, { pausarEscaner: true });

            try {
                await escaner.start({ facingMode: 'environment' }, config, alLeer, () => {});
            } catch {
                // Los portátiles no tienen cámara trasera: se recurre a la frontal.
                await escaner.start({ facingMode: 'user' }, config, alLeer, () => {});
            }

            setCameraActive(true);
        } catch (err) {
            scannerRef.current = null;
            setErrorCamara(`No se pudo iniciar la cámara: ${err?.message || 'permiso denegado'}.`);
        }
    }, [registrarAcceso]);

    useEffect(() => {
        iniciarCamara();

        return () => {
            clearTimeout(temporizadorRef.current);
            detenerCamara();
            // Liberar el contexto de audio al salir de la pantalla.
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
                audioCtxRef.current.close().catch(() => {});
            }
        };
        // Solo al montar: iniciarCamara y detenerCamara son estables.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleManual = (e) => {
        e.preventDefault();
        const codigo = codigoManual.trim();
        if (!codigo) return;
        setCodigoManual('');
        registrarAcceso(codigo);
    };

    const fondoResultado = resultado?.exito
        ? (resultado.tipo === 'entrada'
            ? 'linear-gradient(135deg, rgba(5,150,105,0.97), rgba(16,185,129,0.97))'
            : 'linear-gradient(135deg, rgba(37,99,235,0.97), rgba(14,165,233,0.97))')
        : 'linear-gradient(135deg, rgba(185,28,28,0.97), rgba(239,68,68,0.97))';

    return (
        <main className="main-content" id="contenido" style={{ maxWidth: '800px' }}>
            <div className="animate-slide-up" style={{ textAlign: 'center', marginBottom: 'var(--paso-3)' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: '20px', padding: '0.3rem 1rem', marginBottom: '0.75rem',
                }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s infinite' }} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase' }}>
                        Sistema activo
                    </span>
                </div>
                <h1>Terminal de acceso</h1>
                <p style={{ color: 'var(--text-muted)' }}>Simulador de lector inteligente EntryTech</p>
            </div>

            {errorCamara && (
                <div className="alerta alerta-error" role="alert">{errorCamara}</div>
            )}

            <div className="animate-scale-in" style={{
                position: 'relative', borderRadius: 'var(--radio-lg)', overflow: 'hidden',
                background: '#050505', border: '1px solid rgba(99,102,241,0.15)',
                // aspect-ratio mantiene el visor cuadrado en cualquier ancho; antes
                // un minHeight fijo de 400 px dejaba franjas negras en móvil.
                aspectRatio: '1 / 1',
                maxHeight: '70vh',
            }}>
                <div id="reader" style={{ width: '100%', height: '100%', background: '#000' }} />

                {!cameraActive && !resultado && (
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        background: 'rgba(0,0,0,0.85)', color: '#fff', zIndex: 10, padding: 'var(--paso-3)',
                        textAlign: 'center',
                    }}>
                        <Camera size={56} style={{ color: 'rgba(99,102,241,0.9)' }} />
                        <h3 style={{ margin: 0 }}>Sistema en espera</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            Apunta la cámara al código QR
                        </p>
                        <button onClick={iniciarCamara} className="btn btn-primary click-effect" style={{ borderRadius: '50px', width: 'auto' }}>
                            <Zap size={18} /> Activar escáner
                        </button>
                    </div>
                )}

                {resultado && (
                    <div
                        role="status"
                        aria-live="assertive"
                        style={{
                            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                            padding: 'var(--paso-3)', background: fondoResultado, color: '#fff', zIndex: 20,
                            animation: 'fadeIn 0.2s ease-out',
                        }}
                    >
                        <div style={{ fontSize: 'clamp(3rem, 15vw, 6rem)', lineHeight: 1 }}>
                            {resultado.exito ? (resultado.tipo === 'entrada' ? '✅' : '🚪') : '❌'}
                        </div>
                        <h2 style={{ fontWeight: 900, margin: '0.5rem 0 0.25rem' }}>
                            {resultado.exito ? (resultado.tipo === 'entrada' ? 'ENTRADA' : 'SALIDA') : 'DENEGADO'}
                        </h2>
                        <p style={{ opacity: 0.9 }}>{resultado.mensaje}</p>
                        {resultado.nombre && (
                            <div style={{
                                marginTop: '1rem', padding: '0.5rem 1.5rem', maxWidth: '100%',
                                background: 'rgba(255,255,255,0.2)', borderRadius: '50px',
                                fontWeight: 700, border: '1px solid rgba(255,255,255,0.3)',
                                overflowWrap: 'break-word',
                            }}>
                                {resultado.nombre}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/*
              Ingreso manual del código.
              El wireframe 19.6 lo describe ("campo manual para ingresar
              código") pero la pantalla nunca lo implementó, así que sin cámara
              disponible el kiosco quedaba inutilizable.
            */}
            <form onSubmit={handleManual} className="card" style={{ marginTop: 'var(--paso-3)' }}>
                <label className="form-label" htmlFor="codigo-manual" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Keyboard size={14} /> Ingreso manual del código
                </label>
                <div className="campo-con-boton">
                    <input
                        id="codigo-manual"
                        className="form-control"
                        placeholder="Pega o escribe el código"
                        value={codigoManual}
                        onChange={(e) => setCodigoManual(e.target.value)}
                        disabled={procesando}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck="false"
                    />
                    <button type="submit" className="btn btn-primary" disabled={procesando || !codigoManual.trim()}>
                        Validar
                    </button>
                </div>
                <span className="form-hint" style={{ display: 'block', marginTop: '0.5rem' }}>
                    Úsalo cuando la cámara no esté disponible. El código está en tu carnet digital,
                    bajo el botón «Ver código en texto».
                </span>
            </form>

            <div className="pila-responsive" style={{ marginTop: 'var(--paso-3)' }}>
                {cameraActive && (
                    <button
                        onClick={async () => { await detenerCamara(); setCameraActive(false); setResultado(null); }}
                        className="btn btn-secondary click-effect"
                        style={{ flex: 1 }}
                    >
                        <Square size={16} /> Detener sistema
                    </button>
                )}
                <button
                    onClick={() => setErrorCamara('El modo NFC se activa automáticamente al acercar un carnet en dispositivos Android compatibles.')}
                    className="btn btn-primary click-effect"
                    style={{ flex: 1, background: 'linear-gradient(135deg, var(--secondary), #06b6d4)' }}
                >
                    <Wifi size={18} /> Modo NFC
                </button>
            </div>
        </main>
    );
};

export default KioskSimulator;
