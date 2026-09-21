import config from '../config/env.js';

/**
 * Fondo diario de la pantalla de acceso.
 *
 * Consulta la Imagen Astronómica del Día (APOD) de la NASA y la ofrece al
 * frontend cuando es legalmente utilizable.
 *
 * ATENCIÓN, cuestión de derechos de autor: las publicaciones de APOD NO son
 * todas de dominio público. La NASA las difunde con permiso de sus autores,
 * pero muchas pertenecen a astrofotógrafos particulares que conservan sus
 * derechos. Incorporarlas sin más al fondo de la aplicación sería una
 * infracción. Por eso solo se acepta una imagen cuando cumple dos condiciones:
 *
 *   1. El campo `copyright` viene ausente, lo que indica material propio de la
 *      NASA y por tanto de dominio público.
 *   2. El campo `media_type` es "image": hay días en que la publicación es un
 *      vídeo o una animación interactiva.
 *
 * Medición del 21 de septiembre de 2026 sobre los 14 días anteriores: 9 de 14
 * publicaciones tenían copyright de terceros y 2 no eran imágenes. Es decir,
 * el caso habitual es el rechazo, no la aceptación. Cuando se rechaza, el
 * frontend recurre a su colección local, que rota igualmente cada día.
 *
 * El resultado se guarda en memoria hasta el cambio de fecha: APOD publica una
 * sola imagen al día y no tiene sentido consultar la API en cada visita, sobre
 * todo con el límite de peticiones de una clave gratuita.
 */

const MS_REINTENTO = 10 * 60 * 1000;

let cache = { clave: null, datos: null, expiraEn: 0 };

const fechaDeHoy = () => new Date().toISOString().slice(0, 10);

export const getFondo = async (req, res) => {
    const hoy = fechaDeHoy();

    if (cache.clave === hoy && cache.datos && Date.now() < cache.expiraEn) {
        return res.json(cache.datos);
    }

    const guardar = (datos, duracionMs) => {
        cache = { clave: hoy, datos, expiraEn: Date.now() + duracionMs };
        return res.json(datos);
    };

    // Hasta el final del día, en milisegundos.
    const hastaMedianoche = () => {
        const ahora = new Date();
        const manana = new Date(ahora);
        manana.setUTCHours(24, 0, 0, 0);
        return manana - ahora;
    };

    try {
        const url = `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(config.nasaApiKey)}`;
        // AbortSignal.timeout evita que una API lenta bloquee la pantalla de
        // acceso: si no responde pronto, se usa la colección local.
        const respuesta = await fetch(url, { signal: AbortSignal.timeout(6000) });

        if (!respuesta.ok) {
            // 429 significa que se agotó el límite de la clave. Con DEMO_KEY son
            // apenas 30 peticiones por hora, insuficiente para un sitio público.
            const motivo = respuesta.status === 429 ? 'limite-de-peticiones' : `http-${respuesta.status}`;
            return guardar({ origen: 'local', motivo }, MS_REINTENTO);
        }

        const apod = await respuesta.json();

        if (apod.media_type !== 'image') {
            return guardar({ origen: 'local', motivo: 'no-es-imagen' }, hastaMedianoche());
        }
        if (apod.copyright) {
            return guardar({ origen: 'local', motivo: 'con-derechos-de-autor' }, hastaMedianoche());
        }
        if (!apod.url) {
            return guardar({ origen: 'local', motivo: 'sin-url' }, hastaMedianoche());
        }

        return guardar({
            origen: 'apod',
            // `url` pesa bastante menos que `hdurl` y a pantalla completa, bajo
            // el velo oscuro, la diferencia no se aprecia.
            url: apod.url,
            titulo: apod.title || null,
            fecha: apod.date || hoy,
            credito: 'NASA · Imagen Astronómica del Día',
        }, hastaMedianoche());
    } catch (error) {
        const motivo = error?.name === 'TimeoutError' ? 'tiempo-agotado' : 'sin-conexion';
        // El fallo se cachea poco tiempo: puede ser transitorio.
        return guardar({ origen: 'local', motivo }, MS_REINTENTO);
    }
};
