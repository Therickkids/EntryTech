import test from 'node:test';
import assert from 'node:assert/strict';

import {
    esCorreoValido,
    esCedulaValida,
    esNombreValido,
    validarPassword,
    normalizarCorreo,
    normalizarTexto,
    PASSWORD_MIN,
} from '../utils/validators.js';

test('correo: acepta formatos válidos', () => {
    for (const correo of ['a@b.co', 'julian.manrique@entrytech.co', 'nombre+etiqueta@dominio.com.co']) {
        assert.equal(esCorreoValido(correo), true, correo);
    }
});

test('correo: rechaza formatos inválidos', () => {
    // Sin arroba, sin dominio, con espacios o con el dominio incompleto.
    for (const correo of ['sinarroba', 'a@b', 'a@.co', 'con espacio@b.co', '@b.co', 'a@b.c', '', null]) {
        assert.equal(esCorreoValido(correo), false, String(correo));
    }
});

test('correo: rechaza más de 100 caracteres, que es el límite de la columna', () => {
    // 96 + 5 = 101 caracteres: uno por encima del limite.
    const largo = `${'a'.repeat(96)}@b.co`;
    assert.equal(esCorreoValido(largo), false);
});

test('cédula: solo dígitos, entre 5 y 20', () => {
    assert.equal(esCedulaValida('12345'), true);
    assert.equal(esCedulaValida('1017456789'), true);
    assert.equal(esCedulaValida('1234'), false, 'demasiado corta');
    assert.equal(esCedulaValida('1'.repeat(21)), false, 'demasiado larga');
    assert.equal(esCedulaValida('1.017.456'), false, 'con puntos');
    assert.equal(esCedulaValida('10a74567'), false, 'con letras');
    assert.equal(esCedulaValida(''), false);
});

test('nombre: entre 3 y 100 caracteres, sin contar espacios de sobra', () => {
    assert.equal(esNombreValido('Ana'), true);
    assert.equal(esNombreValido('  Ana  '), true, 'los espacios no cuentan');
    assert.equal(esNombreValido('Al'), false);
    assert.equal(esNombreValido('   '), false, 'solo espacios');
    assert.equal(esNombreValido('x'.repeat(101)), false);
});

test('contraseña: exige longitud mínima y mezcla de letras y números', () => {
    assert.equal(validarPassword('Prueba2026'), null, 'válida');
    assert.notEqual(validarPassword('corta1'), null, 'demasiado corta');
    assert.notEqual(validarPassword('solopalabras'), null, 'sin números');
    assert.notEqual(validarPassword('1234567890'), null, 'sin letras');
    assert.notEqual(validarPassword(null), null, 'nula');
});

test('contraseña: rechaza más de 72 caracteres', () => {
    // bcrypt trunca en 72 bytes: más allá, los caracteres se ignorarían en
    // silencio y el usuario creería tener una contraseña más larga de la real.
    assert.notEqual(validarPassword(`${'a'.repeat(72)}1`), null);
});

test('contraseña: el mensaje menciona la longitud mínima configurada', () => {
    assert.match(validarPassword('a1'), new RegExp(String(PASSWORD_MIN)));
});

test('normalizarCorreo: recorta y pasa a minúsculas', () => {
    assert.equal(normalizarCorreo('  Julian@ENTRYTECH.co '), 'julian@entrytech.co');
    assert.equal(normalizarCorreo(undefined), '');
});

test('normalizarTexto: recorta y colapsa espacios repetidos', () => {
    assert.equal(normalizarTexto('  Julian   Manrique  '), 'Julian Manrique');
    assert.equal(normalizarTexto(null), '');
});
