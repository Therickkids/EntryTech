-- ============================================================
-- Migración 002 · Tokens de recuperación de contraseña
--
-- Aplicar UNA sola vez sobre la base de datos. Es idempotente.
--
-- Problema que resuelve:
--   El mecanismo anterior cambiaba la contraseña presentando correo y cédula.
--   En Colombia la cédula NO es un dato secreto: aparece en contratos,
--   formularios y filtraciones. Cualquiera que conociera ambos datos de una
--   persona podía apoderarse de su cuenta.
--
--   El mecanismo nuevo envía un enlace temporal al correo registrado, de modo
--   que la prueba de identidad pasa a ser el acceso a ese buzón.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS tokens_recuperacion (
    id         SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

    -- Se almacena el SHA-256 del token, nunca el token en claro. Si alguien
    -- leyera esta tabla, no podría usar su contenido para entrar: es el mismo
    -- motivo por el que las contraseñas se guardan cifradas.
    token_hash CHAR(64)    NOT NULL UNIQUE,

    expira_en  TIMESTAMPTZ NOT NULL,

    -- Marca de un solo uso. Un enlace ya utilizado no vuelve a servir aunque
    -- siga dentro de su hora de validez.
    usado_en   TIMESTAMPTZ DEFAULT NULL,

    creado_en  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Búsqueda por token al confirmar el cambio.
CREATE INDEX IF NOT EXISTS idx_tokens_recuperacion_hash
    ON tokens_recuperacion (token_hash);

-- Invalidación de los tokens anteriores de un usuario al pedir uno nuevo.
CREATE INDEX IF NOT EXISTS idx_tokens_recuperacion_usuario
    ON tokens_recuperacion (usuario_id, usado_en);

-- Limpieza periódica de los caducados.
CREATE INDEX IF NOT EXISTS idx_tokens_recuperacion_expira
    ON tokens_recuperacion (expira_en);

COMMIT;

-- ------------------------------------------------------------
-- Mantenimiento opcional: borra los tokens caducados hace más de
-- siete días. Puede ejecutarse a mano de vez en cuando; la tabla
-- crece poco, así que no se automatiza.
--
--   DELETE FROM tokens_recuperacion
--    WHERE expira_en < CURRENT_TIMESTAMP - INTERVAL '7 days';
-- ------------------------------------------------------------
