import React, { useEffect, useState, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, Wifi, ShieldCheck, RefreshCw, Eye, EyeOff, Copy } from 'lucide-react';
import api, { mensajeDeError } from '../services/api';
import { obtenerUsuario, actualizarUsuario } from '../services/session';

/*
  Intervalo de sincronización del QR.
  Antes era de 3 segundos, es decir 1.200 peticiones por hora y usuario. Con
  veinte carnets abiertos el plan gratuito de Render quedaba saturado sin que
  hubiera ni un solo acceso real. El código solo cambia cuando alguien pasa por
  el kiosco, así que 15 segundos es de sobra.
*/
const INTERVALO_SYNC_MS = 15000;
const TAM_MAX_FOTO = 2 * 1024 * 1024;

const Carnet = () => {
    const [usuario, setUsuario] = useState(obtenerUsuario);
    const [cargando, setCargando] = useState(true);
    const [uploadingFoto, setUploadingFoto] = useState(false);
    const [fotoMsg, setFotoMsg] = useState(null);
    const [qrRenovado, setQrRenovado] = useState(false);
    const [syncStatus, setSyncStatus] = useState('idle');
    const [syncError, setSyncError] = useState('');
    const [nfcMsg, setNfcMsg] = useState(null);
    // El código va oculto por defecto: es el mismo secreto que contiene el QR,
    // y mostrarlo siempre facilitaría copiarlo mirando por encima del hombro.
    const [mostrarCodigo, setMostrarCodigo] = useState(false);
    const [copiado, setCopiado] = useState(false);

    const fileInputRef = useRef(null);
    const ultimoQR = useRef(null);

    /*
      Se consulta /api/perfil en lugar de confiar solo en localStorage.
      Antes, si un administrador cambiaba el nombre o el rol de alguien, su
      carnet seguía mostrando los datos antiguos hasta que volvía a entrar.
    */
    const cargarPerfil = useCallback(async () => {
        try {
            const res = await api.get('/perfil');
            setUsuario(res.data);
            actualizarUsuario(res.data);
            ultimoQR.current = res.data.carnet?.codigo_qr || null;
            setSyncStatus('ok');
        } catch (err) {
            setSyncStatus('error');
            setSyncError(mensajeDeError(err, 'No se pudo cargar tu perfil.'));
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargarPerfil(); }, [cargarPerfil]);

    // Sincronización periódica del código QR.
    useEffect(() => {
        if (!usuario?.id) return undefined;

        let activo = true;
        let temporizador = null;

        const sincronizar = async () => {
            if (!activo || document.hidden) return;
            try {
                const res = await api.get(`/usuarios/${usuario.id}/qr`);
                if (!activo) return;

                const nuevoQR = res.data.codigo_qr;
                setSyncStatus('ok');
                setSyncError('');

                if (ultimoQR.current && ultimoQR.current !== nuevoQR) {
                    setQrRenovado(true);
                    setTimeout(() => { if (activo) setQrRenovado(false); }, 5000);
                }
                ultimoQR.current = nuevoQR;

                setUsuario((prev) => {
                    if (!prev) return prev;
                    const actualizado = { ...prev, carnet: { ...prev.carnet, codigo_qr: nuevoQR } };
                    actualizarUsuario(actualizado);
                    return actualizado;
                });
            } catch (err) {
                if (!activo) return;
                setSyncStatus('error');
                setSyncError(mensajeDeError(err, 'Error de conexión.'));
            }
        };

        /*
          El ciclo se detiene cuando la pestaña pasa a segundo plano. La versión
          anterior encadenaba setTimeout en el bloque `finally`, así que seguía
          consultando el servidor indefinidamente aunque el móvil estuviera
          bloqueado en el bolsillo.
        */
        const iniciar = () => {
            if (temporizador) return;
            temporizador = setInterval(sincronizar, INTERVALO_SYNC_MS);
        };
        const detener = () => {
            if (!temporizador) return;
            clearInterval(temporizador);
            temporizador = null;
        };

        const alCambiarVisibilidad = () => {
            if (document.hidden) {
                detener();
            } else {
                sincronizar();
                iniciar();
            }
        };

        if (!document.hidden) iniciar();
        document.addEventListener('visibilitychange', alCambiarVisibilidad);

        return () => {
            activo = false;
            detener();
            document.removeEventListener('visibilitychange', alCambiarVisibilidad);
        };
    }, [usuario?.id]);

    const handleFotoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validación de tipo: antes solo se comprobaba el tamaño, así que un
        // archivo cualquiera renombrado se enviaba al servidor igualmente.
        if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
            setFotoMsg({ tipo: 'error', texto: 'Formato no válido. Usa PNG, JPG, WEBP o GIF.' });
            e.target.value = '';
            return;
        }
        if (file.size > TAM_MAX_FOTO) {
            setFotoMsg({ tipo: 'error', texto: 'La imagen es muy grande. Máximo 2 MB.' });
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => {
            setFotoMsg({ tipo: 'error', texto: 'No se pudo leer el archivo.' });
            setUploadingFoto(false);
        };
        reader.onloadend = async () => {
            const base64 = reader.result;
            setUploadingFoto(true);
            setFotoMsg(null);
            try {
                await api.put(`/usuarios/${usuario.id}/foto`, { foto_url: base64 });
                const actualizado = { ...usuario, foto_url: base64 };
                setUsuario(actualizado);
                actualizarUsuario(actualizado);
                setFotoMsg({ tipo: 'exito', texto: 'Foto actualizada correctamente.' });
            } catch (err) {
                setFotoMsg({ tipo: 'error', texto: mensajeDeError(err, 'Error al subir la foto.') });
            } finally {
                setUploadingFoto(false);
            }
        };
        reader.readAsDataURL(file);
        // Permite volver a elegir el mismo archivo si el primer intento falló.
        e.target.value = '';
    };

    const copiarCodigo = async () => {
        try {
            await navigator.clipboard.writeText(usuario.carnet.codigo_qr);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch {
            // El portapapeles exige contexto seguro y puede estar bloqueado.
            // El código queda visible para copiarlo a mano.
            setCopiado(false);
        }
    };

    const transmitirNFC = async () => {
        setNfcMsg(null);
        if (!('NDEFReader' in window)) {
            // Antes se usaba alert(), que en iOS bloquea la interfaz y no explica
            // la alternativa disponible.
            setNfcMsg({
                tipo: 'info',
                texto: 'Tu navegador no admite Web NFC (Safari e iOS no lo permiten). Usa el código QR: funciona en todos los dispositivos.',
            });
            return;
        }
        try {
            // eslint-disable-next-line no-undef -- API del navegador, solo en Chrome para Android.
            const ndef = new NDEFReader();
            await ndef.write({ records: [{ recordType: 'text', data: usuario.carnet.codigo_nfc }] });
            setNfcMsg({ tipo: 'exito', texto: 'Transmisión NFC completada.' });
        } catch (error) {
            setNfcMsg({ tipo: 'error', texto: `No se pudo transmitir por NFC: ${error.message}` });
        }
    };

    if (cargando) {
        return (
            <main className="main-content" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Recuperando información del carnet...</p>
            </main>
        );
    }

    if (!usuario?.carnet) {
        return (
            <main className="main-content" style={{ textAlign: 'center' }}>
                <div className="alerta alerta-error" role="alert">
                    No encontramos un carnet asociado a tu cuenta. Contacta con un administrador.
                </div>
            </main>
        );
    }

    const inicial = usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : '?';
    const colorSync = syncStatus === 'error' ? 'var(--danger)' : syncStatus === 'ok' ? 'var(--success)' : 'var(--text-muted)';

    return (
        <main className="main-content" id="contenido" style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="animate-slide-up" style={{ width: '100%', maxWidth: '420px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: 'var(--paso-3)' }}>Mi carnet digital</h2>

                <div className="animate-scale-in" style={{
                    borderRadius: 'var(--radio-lg)',
                    overflow: 'hidden',
                    boxShadow: '0 25px 60px rgba(99,102,241,0.25), 0 0 0 1px rgba(99,102,241,0.15)',
                    background: 'rgba(15, 15, 20, 0.85)',
                    border: '1px solid var(--border)',
                    marginBottom: 'var(--paso-3)',
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%)',
                        padding: 'var(--paso-4) var(--paso-3) var(--paso-4)',
                        position: 'relative',
                    }}>
                        <div style={{
                            fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)',
                            letterSpacing: '0.15em', marginBottom: '1rem', textTransform: 'uppercase',
                        }}>
                            EntryTech · Acceso digital
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                aria-label="Cambiar foto de perfil"
                                style={{
                                    width: '76px', height: '76px', borderRadius: '50%',
                                    border: '3px solid rgba(255,255,255,0.6)', padding: 0,
                                    overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                                    background: 'rgba(255,255,255,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                {usuario.foto_url ? (
                                    <img src={usuario.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>{inicial}</span>
                                )}
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                style={{ display: 'none' }}
                                onChange={handleFotoChange}
                            />

                            <div style={{ minWidth: 0, flex: '1 1 140px' }}>
                                <div style={{ color: '#fff', fontSize: 'clamp(1.05rem, 4vw, 1.3rem)', fontWeight: 800, lineHeight: 1.2, wordBreak: 'break-word' }}>
                                    {usuario.nombre}
                                </div>
                                <span style={{
                                    display: 'inline-block', marginTop: '0.5rem',
                                    background: usuario.rol === 'admin' ? '#fbbf24' : 'rgba(255,255,255,0.22)',
                                    color: usuario.rol === 'admin' ? '#1a1a1a' : '#fff',
                                    padding: '0.2rem 0.7rem', borderRadius: '20px',
                                    fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                                }}>
                                    {usuario.rol === 'admin' ? 'Administrador' : 'Usuario'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/*
                      La cédula vuelve al carnet: el manual de usuario indica que
                      el carnet muestra nombre, cédula y código QR, pero el
                      documento de identidad no aparecía por ninguna parte.
                      La rejilla usa auto-fit para no comprimir los datos en
                      pantallas de 320 px.
                    */}
                    <div style={{ padding: 'var(--paso-3)', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--paso-2)' }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Documento</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.25rem' }}>{usuario.cedula}</div>
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Estado</div>
                                <span className="badge badge-entrada" style={{ marginTop: '0.25rem' }}>Activo</span>
                            </div>
                            <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Correo</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.25rem', wordBreak: 'break-all' }}>{usuario.correo}</div>
                            </div>
                        </div>
                    </div>

                    {(fotoMsg || uploadingFoto) && (
                        <div
                            role="status"
                            className={`alerta ${fotoMsg?.tipo === 'error' ? 'alerta-error' : fotoMsg?.tipo === 'exito' ? 'alerta-exito' : 'alerta-info'}`}
                            style={{ margin: 'var(--paso-2)' }}
                        >
                            {uploadingFoto ? 'Subiendo foto...' : fotoMsg?.texto}
                        </div>
                    )}

                    <div style={{ padding: 'var(--paso-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
                        {qrRenovado && (
                            <div className="animate-slide-up" role="status" style={{
                                position: 'absolute', top: 0, zIndex: 10,
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#fff', padding: '0.5rem 1rem', borderRadius: '30px',
                                fontSize: '0.72rem', fontWeight: 800,
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                            }}>
                                <ShieldCheck size={14} /> QR renovado por seguridad
                            </div>
                        )}

                        <div style={{
                            padding: '1rem', background: '#fff', borderRadius: 'var(--radio-md)',
                            boxShadow: '0 0 30px rgba(99,102,241,0.3)', lineHeight: 0,
                            // maxWidth impide que el QR desborde en pantallas muy estrechas.
                            maxWidth: '100%',
                        }}>
                            <QRCodeSVG
                                value={usuario.carnet.codigo_qr}
                                size={180}
                                bgColor="#ffffff"
                                fgColor="#0f0f1a"
                                level="H"
                                style={{ width: '100%', height: 'auto', maxWidth: '180px' }}
                            />
                        </div>

                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                            Muestra este código en el lector de acceso.<br />
                            <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.7rem' }}>
                                Código dinámico de un solo uso
                            </span>
                        </p>

                        {/*
                          Versión en texto del código.
                          El simulador de kiosco admite el ingreso manual, pero hasta ahora el
                          código solo existía dentro de la imagen QR: no había forma de leerlo
                          ni copiarlo, así que aquel campo resultaba inservible.
                        */}
                        <div style={{ width: '100%' }}>
                            <button
                                type="button"
                                className="btn btn-secondary btn-block"
                                onClick={() => setMostrarCodigo((v) => !v)}
                                aria-expanded={mostrarCodigo}
                                aria-controls="codigo-texto"
                                style={{ fontSize: '0.8rem' }}
                            >
                                {mostrarCodigo ? <EyeOff size={16} /> : <Eye size={16} />}
                                {mostrarCodigo ? 'Ocultar código' : 'Ver código en texto'}
                            </button>

                            {mostrarCodigo && (
                                <div id="codigo-texto" className="campo-con-boton">
                                    <code style={{
                                        minWidth: 0,
                                        display: 'block',
                                        padding: '0.7rem 0.9rem',
                                        background: 'rgba(0,0,0,0.35)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radio-sm)',
                                        fontSize: '0.8rem',
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                        color: 'var(--text-main)',
                                        // El código no tiene espacios: sin esto desbordaría la tarjeta.
                                        wordBreak: 'break-all',
                                        userSelect: 'all',
                                    }}>
                                        {usuario.carnet.codigo_qr}
                                    </code>
                                    <button type="button" className="btn btn-secondary" onClick={copiarCodigo}>
                                        <Copy size={16} /> {copiado ? 'Copiado' : 'Copiar'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <RefreshCw
                                size={12}
                                style={{ color: colorSync, animation: syncStatus === 'syncing' ? 'spin 1s linear infinite' : 'none' }}
                            />
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: colorSync }}>
                                {syncStatus === 'error' ? 'Error de conexión' : syncStatus === 'ok' ? 'Sincronizado con el servidor' : 'Monitoreo activo'}
                            </span>
                        </div>
                        {syncStatus === 'error' && syncError && (
                            <span style={{ fontSize: '0.65rem', color: 'var(--danger)', textAlign: 'center' }}>{syncError}</span>
                        )}
                    </div>

                    <div style={{
                        background: 'rgba(255,255,255,0.03)', padding: '0.8rem var(--paso-3)',
                        borderTop: '1px solid var(--border)', display: 'flex',
                        justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
                    }}>
                        <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <ShieldCheck size={12} /> SISTEMA DE ACCESO · ENTRYTECH
                        </span>
                        <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Seguro</span>
                    </div>
                </div>

                {nfcMsg && (
                    <div
                        role="status"
                        className={`alerta ${nfcMsg.tipo === 'error' ? 'alerta-error' : nfcMsg.tipo === 'exito' ? 'alerta-exito' : 'alerta-info'}`}
                    >
                        {nfcMsg.texto}
                    </div>
                )}

                <div className="pila-responsive">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-secondary btn-block"
                        disabled={uploadingFoto}
                    >
                        <Camera size={18} /> {uploadingFoto ? 'Subiendo...' : 'Cambiar foto de perfil'}
                    </button>

                    <button onClick={transmitirNFC} className="btn btn-primary btn-block">
                        <Wifi size={18} /> Transmitir por NFC
                    </button>
                </div>
            </div>
        </main>
    );
};

export default Carnet;
