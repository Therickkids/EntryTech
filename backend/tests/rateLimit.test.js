import test from 'node:test';
import assert from 'node:assert/strict';

import { rateLimit } from '../middlewares/rateLimit.js';
import { crearReq, ejecutar, esperar } from './ayudas.js';

const ip = (direccion) => crearReq({ ip: direccion, socket: { remoteAddress: direccion } });

test('deja pasar mientras no se supere el máximo', async () => {
    const limitar = rateLimit({ ventanaMs: 60000, maximo: 3, nombre: 'prueba-basica' });
    for (let i = 1; i <= 3; i += 1) {
        const r = await ejecutar(limitar, ip('203.0.113.1'));
        assert.equal(r.siguio, true, `intento ${i}`);
    }
});

test('responde 429 al superar el máximo', async () => {
    const limitar = rateLimit({ ventanaMs: 60000, maximo: 2, nombre: 'prueba-tope' });
    const req = ip('203.0.113.2');
    await ejecutar(limitar, req);
    await ejecutar(limitar, req);

    const r = await ejecutar(limitar, req);
    assert.equal(r.siguio, false, 'no debe continuar');
    assert.equal(r.estado, 429);
    assert.match(r.cuerpo.mensaje, /intentos/i);
});

test('incluye la cabecera Retry-After al bloquear', async () => {
    const limitar = rateLimit({ ventanaMs: 60000, maximo: 1, nombre: 'prueba-retry' });
    const req = ip('203.0.113.3');
    await ejecutar(limitar, req);
    const r = await ejecutar(limitar, req);
    assert.ok(Number(r.cabeceras['Retry-After']) > 0, 'debe indicar cuántos segundos esperar');
});

test('cuenta por separado cada dirección IP', async () => {
    // Si el contador fuera global, el primer atacante dejaría fuera a todos
    // los usuarios legítimos.
    const limitar = rateLimit({ ventanaMs: 60000, maximo: 1, nombre: 'prueba-ips' });
    await ejecutar(limitar, ip('203.0.113.10'));
    const bloqueado = await ejecutar(limitar, ip('203.0.113.10'));
    const otro = await ejecutar(limitar, ip('203.0.113.11'));

    assert.equal(bloqueado.siguio, false);
    assert.equal(otro.siguio, true, 'otra IP no debe verse afectada');
});

test('cuenta por separado cada endpoint', async () => {
    // Agotar los intentos de recuperación no debe impedir iniciar sesión.
    const login = rateLimit({ ventanaMs: 60000, maximo: 1, nombre: 'prueba-login' });
    const reset = rateLimit({ ventanaMs: 60000, maximo: 1, nombre: 'prueba-reset' });
    const req = ip('203.0.113.20');

    await ejecutar(login, req);
    assert.equal((await ejecutar(login, req)).siguio, false, 'login agotado');
    assert.equal((await ejecutar(reset, req)).siguio, true, 'reset sigue disponible');
});

test('vuelve a permitir cuando expira la ventana', async () => {
    const limitar = rateLimit({ ventanaMs: 80, maximo: 1, nombre: 'prueba-ventana' });
    const req = ip('203.0.113.30');

    await ejecutar(limitar, req);
    assert.equal((await ejecutar(limitar, req)).siguio, false, 'bloqueado dentro de la ventana');

    await esperar(120);
    assert.equal((await ejecutar(limitar, req)).siguio, true, 'permitido tras expirar');
});

test('usa la primera IP de X-Forwarded-For cuando hay proxy inverso', async () => {
    // Render y Vercel actúan como proxy: sin esto, todas las peticiones
    // compartirían el contador de la IP del proxy.
    const limitar = rateLimit({ ventanaMs: 60000, maximo: 1, nombre: 'prueba-proxy' });
    const cliente = (cadena) => crearReq({ headers: { 'x-forwarded-for': cadena } });

    await ejecutar(limitar, cliente('203.0.113.40, 70.41.3.18'));
    const mismo = await ejecutar(limitar, cliente('203.0.113.40, 10.0.0.1'));
    const distinto = await ejecutar(limitar, cliente('203.0.113.41, 70.41.3.18'));

    assert.equal(mismo.siguio, false, 'mismo cliente, aunque cambie el salto siguiente');
    assert.equal(distinto.siguio, true, 'cliente distinto');
});
