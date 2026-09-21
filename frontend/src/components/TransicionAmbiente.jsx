import React, { useCallback, useEffect, useRef, useState } from 'react';
import { registrarTransicion } from '../services/transicion';

/**
 * Obturador de transición entre ambientes.
 *
 * Dos paneles entran desde arriba y desde abajo hasta juntarse en el centro,
 * donde se enciende una línea luminosa; la pantalla cambia mientras está
 * tapada; después los paneles se retiran y revelan el nuevo contexto.
 *
 * Por qué no basta con el fundido del fondo
 * -----------------------------------------
 * La primera versión solo cruzaba las dos fotografías de fondo. En escritorio
 * se apreciaba, pero en teléfono la tarjeta de acceso ocupa el centro de la
 * pantalla y el cambio ocurría detrás de un panel prácticamente opaco: no se
 * veía nada. Una transición de fondo no puede leerse cuando el fondo está
 * tapado. Este obturador actúa POR ENCIMA del contenido, así que se percibe
 * igual en cualquier tamaño de pantalla.
 *
 * Los paneles permanecen montados siempre, fuera de la pantalla. Montarlos en
 * el momento de cerrar los colocaría directamente en su posición final y el
 * navegador no animaría nada: una transición solo ocurre cuando la propiedad
 * cambia sobre un elemento que ya existía. Es el mismo motivo por el que el
 * fondo no se animaba en su primera versión.
 *
 * Se anima únicamente `transform`, que el navegador compone en la tarjeta
 * gráfica. Ningún panel cambia de tamaño: se desplazan, que es mucho más
 * barato que recalcular la maquetación.
 */

const MS_CERRAR = 520;
const MS_ESPERA = 260;
const MS_ABRIR = 620;

const TransicionAmbiente = () => {
    const [cerrado, setCerrado] = useState(false);
    const [activo, setActivo] = useState(false);
    const temporizadores = useRef([]);

    const limpiar = () => {
        temporizadores.current.forEach(clearTimeout);
        temporizadores.current = [];
    };

    const ejecutar = useCallback(() => {
        // Con movimiento reducido no hay obturador: la navegación es directa.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return Promise.resolve();
        }

        limpiar();
        setActivo(true);
        setCerrado(true);

        return new Promise((resolve) => {
            temporizadores.current.push(setTimeout(() => {
                /*
                  Se resuelve con el obturador cerrado: quien llamó navega
                  ahora, con la pantalla tapada. La espera posterior evita que
                  el cambio de contenido coincida con el primer fotograma de la
                  apertura, que es justo cuando se notaría.
                */
                resolve();

                temporizadores.current.push(setTimeout(() => {
                    setCerrado(false);
                    temporizadores.current.push(setTimeout(() => setActivo(false), MS_ABRIR));
                }, MS_ESPERA));
            }, MS_CERRAR));
        });
    }, []);

    useEffect(() => {
        const quitar = registrarTransicion(ejecutar);
        return () => {
            quitar();
            limpiar();
        };
    }, [ejecutar]);

    return (
        <div
            className={`obturador ${activo ? 'activo' : ''} ${cerrado ? 'cerrado' : ''}`}
            aria-hidden="true"
        >
            <div className="obturador-panel obturador-superior" />
            <div className="obturador-panel obturador-inferior" />
            <div className="obturador-linea" />
            <div className="obturador-marca">EntryTech</div>
        </div>
    );
};

export default TransicionAmbiente;
