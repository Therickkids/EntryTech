-- ============================================================
-- EntryTech · Esquema de base de datos (PostgreSQL 14+)
-- Ejecutable de principio a fin sobre una base vacía.
--
-- Correcciones respecto al esquema anterior:
--   1. Las claves foráneas llevan ON DELETE CASCADE. En la versión desplegada
--      no lo tenían, así que eliminar un usuario desde el panel fallaba con el
--      error 23503 aunque la documentación afirmara que el borrado era en
--      cascada. Para una base ya existente, usa migrations/001.
--   2. usuario_id es NOT NULL: sin la restricción podían quedar carnets y
--      accesos huérfanos, sin dueño.
--   3. Se crean los índices que la documentación describía pero que nunca se
--      habían aplicado.
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id        SERIAL PRIMARY KEY,
    cedula    VARCHAR(20)  NOT NULL UNIQUE,
    nombre    VARCHAR(100) NOT NULL,
    correo    VARCHAR(100) NOT NULL UNIQUE,
    password  VARCHAR(255) NOT NULL,
    rol       VARCHAR(50)  NOT NULL DEFAULT 'usuario'
              CHECK (rol IN ('admin', 'usuario')),
    foto_url  TEXT         DEFAULT NULL,
    creado_en TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carnet (
    id         SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    codigo_nfc VARCHAR(255) NOT NULL UNIQUE,
    codigo_qr  VARCHAR(255) NOT NULL UNIQUE,
    emitido_en TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Relación 1:1 con usuarios, tal y como describe el diagrama entidad-relación.
    CONSTRAINT carnet_usuario_unico UNIQUE (usuario_id)
);

CREATE TABLE IF NOT EXISTS accesos (
    id         SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo       VARCHAR(50) NOT NULL CHECK (tipo IN ('entrada', 'salida')),
    fecha      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- Índices ----------
-- Consulta del historial general del panel (ORDER BY fecha DESC).
CREATE INDEX IF NOT EXISTS idx_accesos_fecha ON accesos (fecha DESC);

-- Regla Anti-Passback: busca el último movimiento de un usuario concreto.
CREATE INDEX IF NOT EXISTS idx_accesos_usuario_fecha ON accesos (usuario_id, fecha DESC);

-- Validación del código en el kiosco. Los UNIQUE ya generan un índice, pero se
-- dejan declarados de forma explícita para documentar la intención.
CREATE INDEX IF NOT EXISTS idx_carnet_usuario ON carnet (usuario_id);

-- Búsqueda de usuarios sin distinguir mayúsculas (login y recuperación).
CREATE INDEX IF NOT EXISTS idx_usuarios_correo_lower ON usuarios (LOWER(correo));

-- ---------- Primer administrador ----------
-- El endpoint /api/register crea siempre usuarios con rol 'usuario': permitir
-- que el rol llegara en el cuerpo de la petición era una vía directa de
-- escalada de privilegios. Para designar al primer administrador, regístrate
-- desde la aplicación y ejecuta después:
--
--   UPDATE usuarios SET rol = 'admin' WHERE correo = 'tu-correo@dominio.com';
--
-- A partir de ahí, ese administrador puede crear más desde el panel.
