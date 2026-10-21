import test from 'node:test';
import assert from 'node:assert/strict';

import { decidirTipoAcceso } from '../controllers/accessController.js';
import { evaluarApod } from '../controllers/fondoController.js';

// ── Regla Anti-Passback ───────────────────────────────────────────────

test('Anti-Passback: el primer movimiento de un usuario es una entrada', () => {
    assert.equal(decidirTipoAcceso(null), 'entrada');
});

test('Anti-Passback: tras una entrada corresponde una salida', () => {
    assert.equal(decidirTipoAcceso('entrada'), 'salida');
});

test('Anti-Passback: tras una salida corresponde una entrada', () => {
    assert.equal(decidirTipoAcceso('salida'), 'entrada');
});

test('Anti-Passback: nunca permite dos entradas seguidas', () => {
    // Es la garantía que da sentido a la regla: se simula una secuencia larga
    // y se comprueba que los movimientos siempre alternan.
    let ultimo = null;
    const secuencia = [];
    for (let i = 0; i < 10; i += 1) {
        ultimo = decidirTipoAcceso(ultimo);
        secuencia.push(ultimo);
    }
    assert.deepEqual(secuencia, [
        'entrada', 'salida', 'entrada', 'salida', 'entrada',
        'salida', 'entrada', 'salida', 'entrada', 'salida',
    ]);
});

test('Anti-Passback: un valor inesperado se trata como «está fuera»', () => {
    // Un dato corrupto en la columna no debe dejar el tipo sin definir, que
    // era lo que provocaba un error poco claro en el INSERT.
    for (const raro of ['', 'ENTRADA', 'otra-cosa', undefined, 0]) {
        assert.equal(decidirTipoAcceso(raro), 'entrada', String(raro));
    }
});

// ── Filtro de derechos de autor de la Imagen Astronómica del Día ──────

const APOD_LIBRE = {
    media_type: 'image',
    url: 'https://apod.nasa.gov/apod/image/2610/foto.jpg',
    title: 'Nebulosa de prueba',
    date: '2026-10-21',
};

test('APOD: acepta una imagen sin campo de derechos, que es material de la NASA', () => {
    const d = evaluarApod(APOD_LIBRE);
    assert.equal(d.origen, 'apod');
    assert.equal(d.url, APOD_LIBRE.url);
    assert.equal(d.titulo, 'Nebulosa de prueba');
    assert.equal(d.fecha, '2026-10-21');
});

test('APOD: rechaza una imagen con derechos de un tercero', () => {
    // Es el caso habitual: la mayoría de publicaciones pertenecen a
    // astrofotógrafos particulares y usarlas sería una infracción.
    const d = evaluarApod({ ...APOD_LIBRE, copyright: 'Piotr Czerski' });
    assert.equal(d.origen, 'local');
    assert.equal(d.motivo, 'con-derechos-de-autor');
    assert.equal(d.url, undefined, 'no debe filtrarse la dirección de la imagen');
});

test('APOD: rechaza los días en que la publicación no es una imagen', () => {
    const d = evaluarApod({ ...APOD_LIBRE, media_type: 'video' });
    assert.equal(d.origen, 'local');
    assert.equal(d.motivo, 'no-es-imagen');
});

test('APOD: el vídeo se rechaza aunque no tenga derechos declarados', () => {
    const d = evaluarApod({ media_type: 'video', url: 'https://youtube.com/x' });
    assert.equal(d.origen, 'local');
});

test('APOD: rechaza una respuesta sin dirección de imagen', () => {
    const { url, ...sinUrl } = APOD_LIBRE;
    assert.equal(evaluarApod(sinUrl).motivo, 'sin-url');
});

test('APOD: rechaza una respuesta que no es un objeto', () => {
    for (const basura of [null, undefined, 'texto', 42]) {
        assert.equal(evaluarApod(basura).origen, 'local', String(basura));
    }
});

test('APOD: un campo de derechos vacío no cuenta como derechos', () => {
    // La API devuelve la clave ausente cuando es material propio; una cadena
    // vacía no debería bloquear una imagen legítima.
    assert.equal(evaluarApod({ ...APOD_LIBRE, copyright: '' }).origen, 'apod');
});
