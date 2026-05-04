# Documentación Técnica: EntryTech
## Sistema Inteligente de Control de Acceso

**Versión:** 1.0.0  
**Fecha:** 4 de mayo de 2026  
**Estado:** Finalizado / Desplegado  

---

## 1. Introducción
**EntryTech** es una solución integral diseñada para modernizar y asegurar el control de acceso en edificios, empresas o eventos. El sistema permite la gestión centralizada de usuarios, la generación de carnets digitales con códigos dinámicos y el registro en tiempo real de entradas y salidas mediante un simulador de kiosco inteligente.

## 2. Objetivos del Proyecto
*   **Seguridad:** Implementar un sistema de autenticación robusto para administradores y guardias.
*   **Eficiencia:** Automatizar el registro de acceso eliminando las bitácoras físicas de papel.
*   **Modernidad:** Proveer a los usuarios de un carnet digital accesible desde cualquier dispositivo móvil.
*   **Trazabilidad:** Mantener un historial auditable de todos los movimientos de acceso.

## 3. Arquitectura del Sistema
El proyecto sigue una arquitectura **Cliente-Servidor** (MERN/PERN Stack):
*   **Frontend:** React.js con Vite, utilizando Vanilla CSS para un diseño premium y responsive.
*   **Backend:** Node.js con Express, estructurado bajo el patrón Controlador-Ruta.
*   **Base de Datos:** PostgreSQL para persistencia de datos relacionales.
*   **Autenticación:** JSON Web Tokens (JWT) y hashing de contraseñas con Bcrypt.

## 4. Especificación de Requerimientos

### 4.1 Requerimientos Funcionales
1.  **Gestión de Usuarios (CRUD):** Registro, edición, consulta y eliminación de perfiles.
2.  **Autenticación y Autorización:** Login seguro con protección de rutas según el rol.
3.  **Generación de Carnet Digital:** Visualización de datos del usuario y generación de código QR/NFC.
4.  **Simulador de Kiosco:** Interfaz para validar accesos y registrar logs automáticamente.
5.  **Dashboard de Administración:** Vista general con estadísticas y gestión rápida.

### 4.2 Requerimientos No Funcionales
1.  **Seguridad:** Encriptación de datos sensibles y protección contra inyecciones SQL.
2.  **Usabilidad:** Interfaz amigable en modo oscuro (Dark Mode) con enfoque en accesibilidad.
3.  **Rendimiento:** Tiempos de respuesta menores a 500ms en la API.
4.  **Escalabilidad:** Código modular preparado para añadir nuevas funcionalidades.

## 5. Diseño de Base de Datos
La base de datos se estructura mediante el archivo `database.sql` con las siguientes entidades principales:
*   **users:** Almacena información de perfil, credenciales y roles (Admin/User).
*   **access_logs:** Registra la fecha, hora, usuario y tipo de movimiento (Entrada/Salida).
*   **roles:** Define los permisos dentro del sistema.

## 6. Descripción de Módulos Principales

### 6.1 Módulo de Autenticación (`authController.js`)
Gestiona el flujo de entrada al sistema, validando credenciales y generando el token de sesión. Incluye la lógica de recuperación de contraseña.

### 6.2 Gestión de Usuarios (`Usuarios.jsx`)
Interfaz administrativa que permite el control total sobre la base de usuarios. Implementa filtros de búsqueda y acciones rápidas de edición.

### 6.3 Carnet Digital (`Carnet.jsx`)
Módulo móvil-first que presenta la identificación del usuario. Es el punto central para el escaneo en los puntos de acceso.

### 6.4 Simulador de Kiosco (`KioskSimulator.jsx`)
Herramienta que simula el punto de acceso físico. Valida si un usuario tiene permiso de entrada y actualiza el historial en tiempo real.

## 7. Despliegue y Mantenimiento
*   **Frontend:** Configurado para despliegue continuo en **Vercel** (`vercel.json`).
*   **Backend:** Preparado para hosting en servicios como Render o Railway.
*   **Variables de Entorno:** Uso de archivos `.env` para proteger llaves secretas y URLs de base de datos.

---
**EntryTech** - *Tecnología que abre puertas.*
