import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import { crearReq, ejecutar } from './ayudas.js';

/*
  El secreto se fija ANTES de importar el módulo de configuración: los
  imports estáticos se evalúan al cargar el archivo, así que se recurre a
  import() dinámico para controlar el orden.
*/
const SECRETO = 'secreto-solo-para-pruebas-con-longitud-suficiente-1234';
process.env.JWT_SECRET = SECRETO;
process.env.NODE_ENV = 'test';

const { verifyToken, verifyAdmin, verifyKiosk } = await import('../middlewares/authMiddleware.js');

const firmar = (datos, opciones = {}) => jwt.sign(datos, SECRETO, { expiresIn: '1h', ...opciones });
const conToken = (token) => crearReq({ headers: { authorization: `Bearer ${token}` } });

// ── verifyToken ───────────────────────────────────────────────────────

test('verifyToken: sin cabecera devuelve 401', async () => {
    const r = await ejecutar(verifyToken, crearReq());
    assert.equal(r.siguio, false);
    assert.equal(r.estado, 401, 'debe ser 401 y no 403: falta autenticación, no permisos');
});

test('verifyToken: exige el esquema Bearer', async () => {
    const token = firmar({ id: 1, rol: 'usuario' });
    const r = await ejecutar(verifyToken, crearReq({ headers: { authorization: token } }));
    assert.equal(r.siguio, false, 'un token sin esquema no debe aceptarse');
    assert.equal(r.estado, 401);
});

test('verifyToken: rechaza un token manipulado', async () => {
    const ajeno = jwt.sign({ id: 1, rol: 'admin' }, 'otro-secreto-distinto', { expiresIn: '1h' });
    const r = await ejecutar(verifyToken, conToken(ajeno));
    assert.equal(r.siguio, false);
    assert.equal(r.estado, 401);
});

test('verifyToken: rechaza un token caducado y lo explica', async () => {
    const caducado = jwt.sign({ id: 1, rol: 'usuario' }, SECRETO, { expiresIn: '-10s' });
    const r = await ejecutar(verifyToken, conToken(caducado));
    assert.equal(r.estado, 401);
    assert.match(r.cuerpo.mensaje, /expirad/i, 'el mensaje debe distinguir la sesión caducada');
});

test('verifyToken: acepta un token válido y expone el usuario', async () => {
    const r = await ejecutar(verifyToken, conToken(firmar({ id: 42, rol: 'admin' })));
    assert.equal(r.siguio, true);
    assert.equal(r.req.user.id, 42);
    assert.equal(r.req.user.rol, 'admin');
});

// ── verifyAdmin ───────────────────────────────────────────────────────

test('verifyAdmin: deja pasar al administrador', async () => {
    const r = await ejecutar(verifyAdmin, crearReq({ user: { id: 1, rol: 'admin' } }));
    assert.equal(r.siguio, true);
});

test('verifyAdmin: rechaza al empleado con 403', async () => {
    const r = await ejecutar(verifyAdmin, crearReq({ user: { id: 9, rol: 'usuario' } }));
    assert.equal(r.siguio, false);
    assert.equal(r.estado, 403);
});

test('verifyAdmin: rechaza cuando no hay usuario en la petición', async () => {
    const r = await ejecutar(verifyAdmin, crearReq());
    assert.equal(r.estado, 403);
});

// ── verifyKiosk ───────────────────────────────────────────────────────

test('verifyKiosk: sin credencial alguna devuelve 401', async () => {
    // Antes existía aquí un camino abierto: cualquiera en internet podía
    // registrar entradas y salidas conociendo un código de carnet.
    const r = await ejecutar(verifyKiosk, crearReq());
    assert.equal(r.siguio, false, 'el terminal no debe aceptar peticiones anónimas');
    assert.equal(r.estado, 401);
});

test('verifyKiosk: un empleado autenticado no puede operar el terminal', async () => {
    const r = await ejecutar(verifyKiosk, conToken(firmar({ id: 9, rol: 'usuario' })));
    assert.equal(r.siguio, false);
    assert.equal(r.estado, 403);
    assert.match(r.cuerpo.mensaje, /administrador/i);
});

test('verifyKiosk: el administrador sí puede operar el terminal', async () => {
    const r = await ejecutar(verifyKiosk, conToken(firmar({ id: 1, rol: 'admin' })));
    assert.equal(r.siguio, true);
    assert.equal(r.req.user.rol, 'admin');
});

test('verifyKiosk: un token inválido devuelve 401, no 403', async () => {
    const r = await ejecutar(verifyKiosk, conToken('esto.no.es.un.token'));
    assert.equal(r.estado, 401);
});
