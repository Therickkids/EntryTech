import test from 'node:test';
import assert from 'node:assert/strict';

import {
    MINUTOS_VALIDEZ,
    construirEnlace,
    generarToken,
    hashToken,
    hashesIguales,
    plantillaCorreo,
    tokenVigente,
} from '../utils/recuperacion.js';

// ── Generación del token ──────────────────────────────────────────────

test('genera un token distinto en cada llamada', () => {
    const vistos = new Set();
    for (let i = 0; i < 200; i += 1) vistos.add(generarToken().token);
    assert.equal(vistos.size, 200, 'no debe repetirse ninguno');
});

test('el token tiene suficiente entropía y es seguro en una URL', () => {
    const { token } = generarToken();
    // 32 bytes en base64url son 43 caracteres.
    assert.equal(token.length, 43);
    assert.match(token, /^[A-Za-z0-9_-]+$/, 'sin caracteres que haya que escapar');
});

test('devuelve la huella del token, no el token', () => {
    const { token, hash } = generarToken();
    assert.notEqual(hash, token);
    assert.equal(hash, hashToken(token), 'la huella debe corresponder al token');
    assert.match(hash, /^[0-9a-f]{64}$/, 'SHA-256 en hexadecimal');
});

test('la huella es estable y distinta para cada entrada', () => {
    assert.equal(hashToken('abc'), hashToken('abc'));
    assert.notEqual(hashToken('abc'), hashToken('abd'));
});

// ── Comparación en tiempo constante ───────────────────────────────────

test('compara huellas iguales y distintas', () => {
    const a = hashToken('token-de-prueba');
    assert.equal(hashesIguales(a, a), true);
    assert.equal(hashesIguales(a, hashToken('otro')), false);
});

test('la comparación no revienta con entradas de distinta longitud', () => {
    // timingSafeEqual lanza si los buffers no miden lo mismo: se comprueba
    // antes para que una entrada manipulada no provoque un error 500.
    assert.equal(hashesIguales('corto', hashToken('x')), false);
    assert.equal(hashesIguales(null, undefined), false);
    assert.equal(hashesIguales(123, 123), false);
});

// ── Vigencia ──────────────────────────────────────────────────────────

const ahora = new Date('2026-10-21T20:00:00Z');
const dentro = new Date('2026-10-21T20:30:00Z');
const pasado = new Date('2026-10-21T19:30:00Z');

test('un token sin usar y sin caducar es válido', () => {
    assert.equal(tokenVigente({ expira_en: dentro, usado_en: null }, ahora), true);
});

test('un token caducado no es válido', () => {
    assert.equal(tokenVigente({ expira_en: pasado, usado_en: null }, ahora), false);
});

test('un token ya usado no es válido aunque no haya caducado', () => {
    // Es la garantía de un solo uso: reenviar el mismo enlace no debe servir.
    assert.equal(tokenVigente({ expira_en: dentro, usado_en: pasado }, ahora), false);
});

test('un token inexistente no es válido', () => {
    assert.equal(tokenVigente(undefined, ahora), false);
    assert.equal(tokenVigente(null, ahora), false);
});

// ── Enlace ────────────────────────────────────────────────────────────

test('construye el enlace sin duplicar la barra', () => {
    assert.equal(
        construirEnlace('https://entry-tech.vercel.app/', 'abc123'),
        'https://entry-tech.vercel.app/recuperar/abc123'
    );
    assert.equal(
        construirEnlace('https://entry-tech.vercel.app', 'abc123'),
        'https://entry-tech.vercel.app/recuperar/abc123'
    );
});

test('el enlace funciona con un token real', () => {
    const { token } = generarToken();
    const enlace = construirEnlace('https://entry-tech.vercel.app', token);
    assert.equal(new URL(enlace).pathname, `/recuperar/${token}`);
});

// ── Correo ────────────────────────────────────────────────────────────

const enlaceDemo = 'https://entry-tech.vercel.app/recuperar/abc123';

test('el correo incluye asunto, versión HTML y versión en texto', () => {
    const c = plantillaCorreo({ nombre: 'Julian', enlace: enlaceDemo });
    assert.ok(c.asunto.length > 0);
    // Algunos clientes bloquean el HTML: sin texto plano, llegaría vacío.
    assert.ok(c.texto.includes(enlaceDemo), 'el enlace debe estar en el texto plano');
    assert.ok(c.html.includes(enlaceDemo), 'y en el HTML');
});

test('el correo saluda por el nombre y funciona sin él', () => {
    assert.match(plantillaCorreo({ nombre: 'Julian', enlace: enlaceDemo }).texto, /Hola Julian/);
    assert.match(plantillaCorreo({ enlace: enlaceDemo }).texto, /^Hola,/m);
});

test('el correo indica la validez del enlace', () => {
    const c = plantillaCorreo({ enlace: enlaceDemo });
    assert.ok(c.texto.includes(String(MINUTOS_VALIDEZ)));
});

test('el correo avisa a quien no pidió el cambio', () => {
    // Si alguien recibe el correo sin haberlo solicitado, debe saber que no
    // tiene que hacer nada.
    assert.match(plantillaCorreo({ enlace: enlaceDemo }).texto, /no fuiste tú/i);
});

test('el nombre se escapa para que no inyecte HTML en el correo', () => {
    // El nombre lo elige el propio usuario al registrarse.
    const c = plantillaCorreo({ nombre: '<script>alert(1)</script>', enlace: enlaceDemo });
    assert.ok(!c.html.includes('<script>'), 'no debe aparecer la etiqueta sin escapar');
    assert.ok(c.html.includes('&lt;script&gt;'), 'debe aparecer escapada');
});
