import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

/**
 * Fondo fotográfico con rotación diaria y transición entre ambientes.
 *
 * El sistema tiene dos ambientes: el acceso público y el interior de la
 * aplicación. Al iniciar sesión la escena cambia, de modo que la transición
 * acompaña al cambio de contexto en lugar de ser un adorno.
 *
 * Selección de la imagen
 * ----------------------
 * La colección local rota con el día del calendario: el mismo día muestra la
 * misma imagen para todo el mundo y cambia sola a medianoche, sin necesidad de
 * un servidor que lo decida. Además se consulta /api/fondo, que devuelve la
 * Imagen Astronómica del Día de la NASA cuando es de dominio público; en ese
 * caso sustituye a la del acceso. El detalle del filtro de derechos de autor
 * está en backend/controllers/fondoController.js
 *
 * Detalles de implementación que importan
 * ---------------------------------------
 * - El componente se monta UNA sola vez, por encima del enrutador. Si viviera
 *   dentro de cada pantalla se desmontaría en cada navegación y el fondo
 *   parpadearía entre ruta y ruta.
 * - Las dos capas existen siempre en el DOM, aunque una esté a opacidad cero,
 *   para que el navegador tenga ambas imágenes descargadas cuando llegue el
 *   momento de cambiar. Una transición que espera a una descarga no es una
 *   transición, es un salto.
 * - Solo se animan `opacity` y `transform`, las dos propiedades que el
 *   navegador compone en la GPU sin rehacer el diseño de la página.
 * - La primera escena aparece sin animación: al abrir la aplicación el fondo
 *   debe estar ya puesto, no llegar con un fundido.
 */

const RUTAS_PUBLICAS = ['/login', '/register', '/reset-password'];

/*
  Colección local. Todas son de la NASA y de dominio público; los créditos
  completos están en public/CREDITOS.txt
*/
const COLECCION = [
    'earthset',
    'tierra-naciente',
    'amanecer-orbital',
    'aurora',
    'ciudades',
    'resplandor',
];

/**
 * Número de día del calendario local. Se construye con la fecha local y no con
 * Date.now() directamente, para que el cambio ocurra a medianoche del usuario
 * y no a las 19:00, que es la medianoche UTC en Colombia.
 */
const diaDelCalendario = () => {
    const ahora = new Date();
    return Math.floor(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()) / 86400000);
};

const rutaLocal = (nombre) => `/fondos/${nombre}.jpg`;

const FondoEscena = () => {
    const location = useLocation();
    const esPublica = RUTAS_PUBLICAS.includes(location.pathname);

    const dia = diaDelCalendario();
    // Un desfase impar garantiza que las dos escenas del día nunca coincidan.
    const localExterior = rutaLocal(COLECCION[dia % COLECCION.length]);
    const localInterior = rutaLocal(COLECCION[(dia + 3) % COLECCION.length]);

    const [exterior, setExterior] = useState(localExterior);

    /*
      Durante el primer fotograma las transiciones están desactivadas, para que
      la escena inicial aparezca ya puesta y no con un fundido. Se habilitan en
      el siguiente fotograma, antes de que pueda ocurrir ningún cambio de ruta.
    */
    const [transiciones, setTransiciones] = useState(false);

    useEffect(() => {
        const id = requestAnimationFrame(() => setTransiciones(true));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        let vigente = true;

        api.get('/fondo')
            .then(({ data }) => {
                if (!vigente || data?.origen !== 'apod' || !data.url) return;

                /*
                  La imagen se precarga antes de sustituir la local. Si se
                  asignara directamente, el usuario vería el fondo en negro
                  durante la descarga, que en una foto astronómica puede tardar.
                */
                const prueba = new Image();
                prueba.onload = () => { if (vigente) setExterior(data.url); };
                prueba.src = data.url;
            })
            .catch(() => {
                // Sin conexión con el backend se conserva la imagen local.
            });

        return () => { vigente = false; };
    }, []);

    return (
        <div className={`escena ${transiciones ? '' : 'sin-transicion'}`} aria-hidden="true">
            <div
                className={`escena-capa ${esPublica ? 'activa' : ''}`}
                style={{ backgroundImage: `url(${exterior})` }}
            />
            <div
                className={`escena-capa ${esPublica ? '' : 'activa'}`}
                style={{ backgroundImage: `url(${localInterior})` }}
            />
            <div className={`escena-velo ${esPublica ? '' : 'velo-interior'}`} />
        </div>
    );
};

export default FondoEscena;
