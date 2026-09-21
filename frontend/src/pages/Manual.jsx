import React from 'react';
import './Manual.css';

/*
  Manual de usuario.
  Se corrigieron dos indicaciones que no coincidían con el sistema real:
  el acceso se hace con el correo electrónico (no con el número de
  identificación) y la creación de usuarios se realiza desde el botón
  "Nuevo usuario" del módulo de personal, que antes ni siquiera existía.
*/
const secciones = [
    {
        titulo: '1. Inicio de sesión',
        contenido: (
            <p>
                Ingresa con tu <strong>correo electrónico</strong> y tu contraseña. El sistema
                identifica tu rol automáticamente: los administradores entran al Dashboard y el
                resto de usuarios a su carnet digital. Si olvidaste la contraseña, usa el enlace
                de recuperación y valida tu correo junto con tu cédula.
            </p>
        ),
    },
    {
        titulo: '2. Dashboard (panel de control)',
        contenido: (
            <>
                <p>Disponible solo para administradores. Desde aquí puedes:</p>
                <ul>
                    <li><strong>Buscador:</strong> filtra por nombre, cédula, correo o tipo de movimiento. No hace falta escribir las tildes.</li>
                    <li><strong>Indicadores:</strong> entradas del día, personal activo, total de registros y último acceso.</li>
                    <li><strong>Registros recientes:</strong> listado paginado de 25 en 25, ordenado del más nuevo al más antiguo.</li>
                    <li><strong>Exportar CSV:</strong> descarga el resultado del filtro actual, listo para abrir en Excel.</li>
                </ul>
            </>
        ),
    },
    {
        titulo: '3. Gestión de usuarios',
        contenido: (
            <>
                <p>En el módulo de personal, un administrador puede:</p>
                <ul>
                    <li><strong>Crear:</strong> botón &quot;Nuevo usuario&quot;. Se genera el carnet automáticamente.</li>
                    <li><strong>Consultar:</strong> toca cualquier fila para ver el detalle completo.</li>
                    <li><strong>Editar:</strong> actualiza nombre, correo y rol.</li>
                    <li><strong>Eliminar:</strong> da de baja al usuario junto con su carnet e historial.</li>
                </ul>
                <p>
                    Por seguridad no puedes eliminar tu propia cuenta ni quitarte el rol de
                    administrador: así el sistema nunca se queda sin nadie que lo administre.
                </p>
            </>
        ),
    },
    {
        titulo: '4. Carnet digital',
        contenido: (
            <p>
                Tu identificación personal. Muestra nombre, documento, correo y un código QR que
                se renueva cada vez que lo usas, de modo que una captura de pantalla antigua deja
                de servir. También puedes cambiar tu foto de perfil (máximo 2 MB).
            </p>
        ),
    },
    {
        titulo: '5. Simulador de kiosco',
        contenido: (
            <p>
                Simula el terminal de acceso. Escanea el QR con la cámara o escribe el código a
                mano si el dispositivo no tiene cámara disponible. El sistema decide solo si es
                una entrada o una salida según tu último movimiento registrado.
            </p>
        ),
    },
    {
        titulo: '6. Seguridad y datos personales',
        contenido: (
            <>
                <p>
                    Cierra la sesión al terminar. Las sesiones caducan a las 8 horas y, cuando eso
                    ocurre, el sistema te devuelve al inicio de sesión avisándote del motivo.
                </p>
                <p>
                    EntryTech trata tus datos personales conforme a la Ley 1581 de 2012 y el
                    Decreto 1377 de 2013: por eso el registro exige tu autorización expresa antes
                    de guardar cédula, correo y fotografía.
                </p>
            </>
        ),
    },
];

const Manual = () => (
    <main className="manual-container main-content" id="contenido">
        <div className="manual-card">
            <h1>Manual de usuario · EntryTech</h1>
            <p className="manual-intro">
                Guía de uso del sistema de control de acceso. Cada sección corresponde a una
                pantalla de la aplicación.
            </p>

            {secciones.map((s) => (
                <section className="manual-section" key={s.titulo}>
                    <h2>{s.titulo}</h2>
                    {s.contenido}
                </section>
            ))}

            <div className="manual-footer">
                <p>© 2026 EntryTech · Institución Universitaria Pascual Bravo</p>
            </div>
        </div>
    </main>
);

export default Manual;
