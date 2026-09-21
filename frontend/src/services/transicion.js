/**
 * Coordinación de la transición de ambiente.
 *
 * El problema que resuelve: la navegación de React Router es instantánea, de
 * modo que si la animación se disparase al detectar el cambio de ruta, el
 * usuario vería primero la pantalla nueva y solo después el obturador
 * cerrándose sobre ella. El orden correcto es el inverso.
 *
 * Con este pequeño registro, la pantalla que provoca el cambio puede esperar a
 * que el obturador esté cerrado antes de navegar. Así el cambio de contenido
 * ocurre oculto y la apertura revela la pantalla ya montada.
 *
 * Se implementa a mano, sin librería de estado: hay un único suscriptor, el
 * componente de transición, y montarlo sobre un contexto de React obligaría a
 * volver a renderizar el árbol entero en cada cambio.
 */

let suscriptor = null;

/** Lo invoca el componente de transición al montarse. */
export const registrarTransicion = (fn) => {
    suscriptor = fn;
    return () => {
        if (suscriptor === fn) suscriptor = null;
    };
};

/**
 * Cierra el obturador y resuelve cuando la pantalla está tapada.
 * Si no hay componente registrado (o el usuario pidió reducir el movimiento),
 * resuelve de inmediato y la navegación ocurre sin animación.
 */
export const cerrarTransicion = () => {
    if (!suscriptor) return Promise.resolve();
    return suscriptor();
};
