import React from 'react';
import './Manual.css';

const Manual = () => {
    return (
        <div className="manual-container">
            <div className="manual-card">
                <h1>📖 Manual de Usuario - EntryTech</h1>
                <p className="manual-intro">Bienvenido a la guía oficial de uso de EntryTech. Aquí aprenderás a sacar el máximo provecho de todas las funciones del sistema.</p>
                
                <section className="manual-section">
                    <h2>1. Inicio de Sesión</h2>
                    <p>Acceda con su número de identificación y contraseña. El sistema validará su rol (Admin o Usuario) automáticamente.</p>
                </section>

                <section className="manual-section">
                    <h2>2. Dashboard (Panel de Control)</h2>
                    <p>Como administrador, podrá ver estadísticas en tiempo real:</p>
                    <ul>
                        <li><strong>Buscador Inteligente:</strong> Localice usuarios rápidamente escribiendo su nombre o cédula. No se preocupe por las tildes, el buscador las maneja automáticamente.</li>
                        <li><strong>Estadísticas:</strong> Visualice el total de usuarios registrados y los movimientos del día.</li>
                        <li><strong>Registros Recientes:</strong> Una tabla con los últimos accesos ordenados cronológicamente.</li>
                    </ul>
                </section>

                <section className="manual-section">
                    <h2>3. Gestión de Usuarios</h2>
                    <p>En el módulo de Usuarios, puede:</p>
                    <ul>
                        <li><strong>Crear:</strong> Añadir nuevos perfiles al sistema.</li>
                        <li><strong>Editar:</strong> Actualizar datos de contacto o roles.</li>
                        <li><strong>Eliminar:</strong> Dar de baja a usuarios que ya no requieran acceso.</li>
                    </ul>
                </section>

                <section className="manual-section">
                    <h2>4. Carnet Digital</h2>
                    <p>Su identificación personal en formato digital. Contiene un código QR dinámico que es esencial para el registro de entrada y salida en los puntos de control.</p>
                </section>

                <section className="manual-section">
                    <h2>5. Simulador de Kiosco</h2>
                    <p>Herramienta diseñada para el personal de seguridad. Permite simular el escaneo del carnet y registrar el movimiento en la base de datos de forma inmediata.</p>
                </section>

                <section className="manual-section">
                    <h2>6. Seguridad</h2>
                    <p>Recuerde siempre cerrar su sesión al terminar. Hemos implementado un sistema de confirmación de cierre para evitar que pierda su acceso accidentalmente.</p>
                </section>

                <div className="manual-footer">
                    <p>© 2026 EntryTech - Tecnología que abre puertas.</p>
                </div>
            </div>
        </div>
    );
};

export default Manual;
