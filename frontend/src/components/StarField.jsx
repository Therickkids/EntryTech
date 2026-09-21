import React, { useEffect, useRef } from 'react';

/**
 * Campo estelar interactivo del panel de inicio.
 *
 * Sustituye al fondo de partículas anterior, que era plano y no reaccionaba al
 * usuario. Aquí las estrellas se organizan en tres capas de profundidad que se
 * desplazan a distinta velocidad según la posición del puntero (paralaje), se
 * apartan cuando el cursor se acerca y tejen constelaciones entre ellas y hacia
 * el propio cursor. Cada cierto tiempo cruza un meteoro.
 *
 * Decisiones de rendimiento:
 * - El trazado de constelaciones es de orden cuadrático, así que se limita a la
 *   capa frontal, que es la que tiene menos estrellas.
 * - La densidad total depende del área de la pantalla, no es un número fijo.
 * - Todo el estado del puntero vive en una referencia: si estuviera en el estado
 *   de React, cada movimiento del ratón provocaría un renderizado completo.
 * - Con prefers-reduced-motion se dibuja un cielo fijo, sin animación ni
 *   interacción, porque el movimiento continuo resulta molesto para personas
 *   sensibles a él.
 */

const CAPAS = [
    // lejana: muchas estrellas pequeñas, casi inmóviles
    { proporcion: 0.42, radioMin: 0.4, radioMax: 1.0, alpha: 0.5, paralaje: 6, deriva: 0.02 },
    // media: participa en los enlaces al cursor
    { proporcion: 0.33, radioMin: 0.9, radioMax: 1.7, alpha: 0.75, paralaje: 16, deriva: 0.05 },
    // cercana: grandes y brillantes; son las que tejen constelaciones
    { proporcion: 0.25, radioMin: 1.4, radioMax: 2.6, alpha: 1, paralaje: 34, deriva: 0.09 },
];

const TONOS = ['186,205,255', '255,255,255', '255,226,196', '167,185,255', '255,246,214'];

/*
  Radios de influencia. Los valores iniciales (115 y 165 px) resultaron
  demasiado cortos: con la capa frontal repartida por toda la pantalla, casi
  ningún par de estrellas caía dentro del radio y las constelaciones no llegaban
  a dibujarse nunca. Se ampliaron tras comprobarlo en pantalla.
*/
const RADIO_REPULSION = 140;
const RADIO_ENLACE_CURSOR = 210;
const RADIO_CONSTELACION = 155;

const StarField = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        const ctx = canvas.getContext('2d');
        const reduceMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let ancho = 0;
        let alto = 0;
        let estrellas = [];
        let meteoros = [];
        let animacionId = null;
        let temporizadorResize = null;
        let proximoMeteoro = 0;

        // Puntero en coordenadas absolutas y su versión suavizada, que es la que
        // realmente se usa para el paralaje: sin suavizado el fondo daría saltos.
        const puntero = { x: -9999, y: -9999, activo: false };
        const paralaje = { x: 0, y: 0, objetivoX: 0, objetivoY: 0 };

        const aleatorio = (min, max) => Math.random() * (max - min) + min;

        const construir = () => {
            ancho = window.innerWidth;
            alto = window.innerHeight;

            canvas.width = Math.floor(ancho * dpr);
            canvas.height = Math.floor(alto * dpr);
            canvas.style.width = `${ancho}px`;
            canvas.style.height = `${alto}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Densidad proporcional al área, con topes para móviles y monitores grandes.
            const total = Math.max(60, Math.min(220, Math.round((ancho * alto) / 9000)));

            estrellas = [];
            CAPAS.forEach((capa, indice) => {
                const cantidad = Math.round(total * capa.proporcion);
                for (let i = 0; i < cantidad; i += 1) {
                    estrellas.push({
                        capa: indice,
                        x: Math.random() * ancho,
                        y: Math.random() * alto,
                        r: aleatorio(capa.radioMin, capa.radioMax),
                        tono: TONOS[Math.floor(Math.random() * TONOS.length)],
                        alphaBase: capa.alpha * aleatorio(0.5, 1),
                        // Fase y velocidad del parpadeo, distintas en cada estrella
                        // para que el titileo no se sincronice.
                        fase: Math.random() * Math.PI * 2,
                        velFase: aleatorio(0.4, 1.4),
                        vx: aleatorio(-capa.deriva, capa.deriva),
                        vy: aleatorio(-capa.deriva, capa.deriva),
                        // Desplazamiento temporal por efecto del cursor.
                        ox: 0,
                        oy: 0,
                    });
                }
            });
        };

        const dibujarEstrella = (e, px, py, alpha) => {
            ctx.beginPath();
            ctx.arc(px, py, e.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${e.tono},${alpha})`;
            ctx.fill();

            // Halo solo en las estrellas grandes: aplicarlo a todas dispararía
            // el coste de composición sin ganancia visual apreciable.
            if (e.r > 1.6) {
                const halo = ctx.createRadialGradient(px, py, 0, px, py, e.r * 5);
                halo.addColorStop(0, `rgba(${e.tono},${alpha * 0.35})`);
                halo.addColorStop(1, `rgba(${e.tono},0)`);
                ctx.beginPath();
                ctx.arc(px, py, e.r * 5, 0, Math.PI * 2);
                ctx.fillStyle = halo;
                ctx.fill();
            }
        };

        const cieloFijo = () => {
            ctx.clearRect(0, 0, ancho, alto);
            estrellas.forEach((e) => dibujarEstrella(e, e.x, e.y, e.alphaBase));
        };

        const lanzarMeteoro = () => {
            const desdeArriba = Math.random() > 0.35;
            meteoros.push({
                x: desdeArriba ? aleatorio(0, ancho) : -60,
                y: desdeArriba ? -40 : aleatorio(0, alto * 0.5),
                vx: aleatorio(3.4, 6.2),
                vy: aleatorio(1.6, 3.2),
                largo: aleatorio(70, 160),
                vida: 1,
            });
        };

        const dibujar = (tiempo) => {
            ctx.clearRect(0, 0, ancho, alto);

            // Suavizado del paralaje hacia su objetivo.
            paralaje.x += (paralaje.objetivoX - paralaje.x) * 0.045;
            paralaje.y += (paralaje.objetivoY - paralaje.y) * 0.045;

            const segundos = tiempo / 1000;
            // Capa frontal: teje constelaciones entre sí (coste cuadrático).
            const frontales = [];
            // Capas media y frontal: se enlazan con el cursor (coste lineal).
            const enlazables = [];

            for (let i = 0; i < estrellas.length; i += 1) {
                const e = estrellas[i];
                const capa = CAPAS[e.capa];

                // Deriva propia, con reaparición por el lado opuesto.
                e.x += e.vx;
                e.y += e.vy;
                if (e.x < -10) e.x = ancho + 10;
                if (e.x > ancho + 10) e.x = -10;
                if (e.y < -10) e.y = alto + 10;
                if (e.y > alto + 10) e.y = -10;

                const px0 = e.x + paralaje.x * capa.paralaje;
                const py0 = e.y + paralaje.y * capa.paralaje;

                // Repulsión: el cursor aparta las estrellas que tiene cerca.
                let objetivoX = 0;
                let objetivoY = 0;
                if (puntero.activo) {
                    const dx = px0 - puntero.x;
                    const dy = py0 - puntero.y;
                    const dist2 = dx * dx + dy * dy;
                    if (dist2 < RADIO_REPULSION * RADIO_REPULSION && dist2 > 0.01) {
                        const dist = Math.sqrt(dist2);
                        const fuerza = 1 - dist / RADIO_REPULSION;
                        // Las capas cercanas reaccionan más: refuerza la profundidad.
                        const escala = 16 + e.capa * 14;
                        objetivoX = (dx / dist) * fuerza * escala;
                        objetivoY = (dy / dist) * fuerza * escala;
                    }
                }
                e.ox += (objetivoX - e.ox) * 0.09;
                e.oy += (objetivoY - e.oy) * 0.09;

                const px = px0 + e.ox;
                const py = py0 + e.oy;

                // Titileo.
                const titileo = 0.72 + 0.28 * Math.sin(segundos * e.velFase + e.fase);
                dibujarEstrella(e, px, py, e.alphaBase * titileo);

                if (e.capa === 2) frontales.push({ x: px, y: py });
                if (e.capa >= 1) enlazables.push({ x: px, y: py, r: e.r });
            }

            // Constelaciones entre estrellas de la capa frontal.
            ctx.lineWidth = 0.7;
            for (let i = 0; i < frontales.length; i += 1) {
                for (let j = i + 1; j < frontales.length; j += 1) {
                    const dx = frontales[i].x - frontales[j].x;
                    const dy = frontales[i].y - frontales[j].y;
                    const dist2 = dx * dx + dy * dy;
                    if (dist2 < RADIO_CONSTELACION * RADIO_CONSTELACION) {
                        const dist = Math.sqrt(dist2);
                        ctx.strokeStyle = `rgba(160,180,255,${0.22 * (1 - dist / RADIO_CONSTELACION)})`;
                        ctx.beginPath();
                        ctx.moveTo(frontales[i].x, frontales[i].y);
                        ctx.lineTo(frontales[j].x, frontales[j].y);
                        ctx.stroke();
                    }
                }
            }

            // Enlaces desde el cursor: es lo que hace sentir que el cielo responde.
            if (puntero.activo) {
                ctx.lineWidth = 1;
                for (let i = 0; i < enlazables.length; i += 1) {
                    const dx = enlazables[i].x - puntero.x;
                    const dy = enlazables[i].y - puntero.y;
                    const dist2 = dx * dx + dy * dy;
                    if (dist2 < RADIO_ENLACE_CURSOR * RADIO_ENLACE_CURSOR) {
                        const dist = Math.sqrt(dist2);
                        const intensidad = 1 - dist / RADIO_ENLACE_CURSOR;
                        ctx.strokeStyle = `rgba(139,150,255,${0.6 * intensidad})`;
                        ctx.beginPath();
                        ctx.moveTo(puntero.x, puntero.y);
                        ctx.lineTo(enlazables[i].x, enlazables[i].y);
                        ctx.stroke();

                        // La estrella enlazada se aviva mientras dura el enlace.
                        ctx.beginPath();
                        ctx.arc(enlazables[i].x, enlazables[i].y, enlazables[i].r * 1.6, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(226,232,255,${0.5 * intensidad})`;
                        ctx.fill();
                    }
                }

                // Resplandor tenue alrededor del cursor.
                const brillo = ctx.createRadialGradient(
                    puntero.x, puntero.y, 0, puntero.x, puntero.y, RADIO_REPULSION
                );
                brillo.addColorStop(0, 'rgba(129,140,248,0.10)');
                brillo.addColorStop(1, 'rgba(129,140,248,0)');
                ctx.beginPath();
                ctx.arc(puntero.x, puntero.y, RADIO_REPULSION, 0, Math.PI * 2);
                ctx.fillStyle = brillo;
                ctx.fill();
            }

            // Meteoros.
            if (tiempo > proximoMeteoro) {
                lanzarMeteoro();
                proximoMeteoro = tiempo + aleatorio(5200, 11000);
            }

            meteoros = meteoros.filter((m) => {
                m.x += m.vx;
                m.y += m.vy;
                m.vida -= 0.006;

                const norma = Math.hypot(m.vx, m.vy);
                const colaX = m.x - (m.vx / norma) * m.largo;
                const colaY = m.y - (m.vy / norma) * m.largo;

                const estela = ctx.createLinearGradient(m.x, m.y, colaX, colaY);
                estela.addColorStop(0, `rgba(255,255,255,${0.85 * m.vida})`);
                estela.addColorStop(0.4, `rgba(168,190,255,${0.3 * m.vida})`);
                estela.addColorStop(1, 'rgba(168,190,255,0)');

                ctx.strokeStyle = estela;
                ctx.lineWidth = 1.6;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(m.x, m.y);
                ctx.lineTo(colaX, colaY);
                ctx.stroke();

                return m.vida > 0 && m.x < ancho + 200 && m.y < alto + 200;
            });

            animacionId = requestAnimationFrame(dibujar);
        };

        const alMover = (e) => {
            puntero.x = e.clientX;
            puntero.y = e.clientY;
            puntero.activo = true;
            // Normalizado a [-1, 1] respecto al centro de la ventana.
            paralaje.objetivoX = (e.clientX / ancho - 0.5) * -2;
            paralaje.objetivoY = (e.clientY / alto - 0.5) * -2;
        };

        const alSalir = () => {
            puntero.activo = false;
            paralaje.objetivoX = 0;
            paralaje.objetivoY = 0;
        };

        const alTocar = (e) => {
            const t = e.touches[0];
            if (!t) return;
            puntero.x = t.clientX;
            puntero.y = t.clientY;
            puntero.activo = true;
            paralaje.objetivoX = (t.clientX / ancho - 0.5) * -2;
            paralaje.objetivoY = (t.clientY / alto - 0.5) * -2;
        };

        const alRedimensionar = () => {
            clearTimeout(temporizadorResize);
            temporizadorResize = setTimeout(() => {
                construir();
                if (reduceMovimiento) cieloFijo();
            }, 200);
        };

        construir();

        if (reduceMovimiento) {
            cieloFijo();
        } else {
            window.addEventListener('mousemove', alMover, { passive: true });
            window.addEventListener('mouseout', alSalir, { passive: true });
            window.addEventListener('touchmove', alTocar, { passive: true });
            window.addEventListener('touchend', alSalir, { passive: true });
            animacionId = requestAnimationFrame(dibujar);
        }

        window.addEventListener('resize', alRedimensionar);

        return () => {
            if (animacionId) cancelAnimationFrame(animacionId);
            clearTimeout(temporizadorResize);
            window.removeEventListener('resize', alRedimensionar);
            window.removeEventListener('mousemove', alMover);
            window.removeEventListener('mouseout', alSalir);
            window.removeEventListener('touchmove', alTocar);
            window.removeEventListener('touchend', alSalir);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{
                position: 'fixed',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                pointerEvents: 'none',
            }}
        />
    );
};

export default StarField;
