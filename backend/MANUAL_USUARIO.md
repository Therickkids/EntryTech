# Manual de Administración y Backend - EntryTech

Este manual está dirigido a los administradores del sistema y desarrolladores encargados del mantenimiento del servidor de **EntryTech**.

---

## 1. Requisitos del Sistema
- **Node.js:** Versión 16 o superior.
- **Base de Datos:** PostgreSQL 13 o superior.
- **Gestor de Paquetes:** npm o yarn.

## 2. Configuración Inicial
Para poner en marcha el backend, siga estos pasos:

1.  **Instalación de Dependencias:**
    ```bash
    cd backend
    npm install
    ```
2.  **Variables de Entorno:**
    Cree un archivo `.env` en la carpeta raíz del backend con los siguientes parámetros:
    - `DB_USER`: Usuario de PostgreSQL.
    - `DB_PASSWORD`: Contraseña de PostgreSQL.
    - `DB_HOST`: Servidor de la base de datos (ej. localhost).
    - `DB_PORT`: Puerto (ej. 5432).
    - `DB_NAME`: Nombre de la base de datos (entrytech).
    - `JWT_SECRET`: Clave secreta para la firma de tokens.

3.  **Preparación de la Base de Datos:**
    Ejecute el script `database.sql` ubicado en la raíz del proyecto para crear las tablas y relaciones necesarias.

## 3. Ejecución del Servidor
- **Modo Desarrollo:** `npm run dev` (utiliza nodemon para reinicio automático).
- **Modo Producción:** `npm start`.

## 4. Estructura de la API (Endpoints)
El backend expone los siguientes servicios principales:

- **Autenticación:**
  - `POST /api/auth/login`: Validación de credenciales.
- **Usuarios:**
  - `GET /api/users`: Listar todos los usuarios.
  - `POST /api/users`: Crear un nuevo usuario.
  - `PUT /api/users/:id`: Actualizar datos de un usuario.
  - `DELETE /api/users/:id`: Eliminar un usuario.
- **Accesos:**
  - `GET /api/access/logs`: Historial de entradas y salidas.
  - `POST /api/access/register`: Registrar un nuevo movimiento.

## 5. Mantenimiento y Seguridad
- **Logs:** El sistema registra todos los intentos de acceso. Revise la tabla `access_logs` para auditorías.
- **Tokens:** Los JWT tienen un tiempo de expiración configurado para garantizar la seguridad de las sesiones.
- **Cifrado:** Todas las contraseñas se almacenan cifradas mediante el algoritmo **Bcrypt**.

---
*EntryTech - Soporte Técnico y Administración.*
