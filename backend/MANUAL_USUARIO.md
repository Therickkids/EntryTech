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
    - `DB_NAME`: Nombre de la base de datos (ej. postgres).
    - `JWT_SECRET`: Clave secreta para la firma de tokens.

> [!IMPORTANT]
> **Configuración de Producción (Supabase + Render):** 
> Para conectar con la base de datos en producción, asegúrese de configurar estas variables exactas en el panel de **Render** (sección Environment):
> - **DB_HOST:** `aws-1-sa-east-1.pooler.supabase.com`
> - **DB_PORT:** `5432`
> - **DB_USER:** `postgres.otjlhkgzryhbmwlsawnz`
> - **DB_PASSWORD:** `1058526407julian`
> - **DB_NAME:** `postgres`

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

## 5. Despliegue en Render
Para desplegar el backend en **Render**, siga estos pasos:

1.  **Crear un nuevo Web Service:** Conecte su repositorio de GitHub.
2.  **Configuración del Entorno:**
    - **Runtime:** `Node`
    - **Build Command:** `npm install` (asegúrese de que el Root Directory apunte a la carpeta `backend`).
    - **Start Command:** `node server.js` o `npm start`.
3.  **Variables de Entorno (Environment):**
    Agregue todas las variables definidas en el archivo `.env`. Para la base de datos de Supabase, es recomendable usar la variable `DATABASE_URL` con la cadena de conexión completa proporcionada por Supabase (modo pooler).

## 6. Mantenimiento y Seguridad
- **Logs:** El sistema registra todos los intentos de acceso. Revise la tabla `access_logs` para auditorías.
- **Tokens:** Los JWT tienen un tiempo de expiración configurado para garantizar la seguridad de las sesiones.
- **Cifrado:** Todas las contraseñas se almacenan cifradas mediante el algoritmo **Bcrypt**.

---
*EntryTech - Soporte Técnico y Administración.*
