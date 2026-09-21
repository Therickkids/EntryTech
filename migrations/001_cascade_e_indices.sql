-- ============================================================
-- Migración 001 · Borrado en cascada, índices y restricciones
--
-- Aplicar UNA sola vez sobre la base de datos ya existente (Supabase).
-- Es idempotente: puede ejecutarse de nuevo sin efectos secundarios.
--
-- Problema que resuelve:
--   Las claves foráneas de `carnet` y `accesos` se crearon sin
--   ON DELETE CASCADE. Por eso el botón "Eliminar" del panel de usuarios
--   devolvía siempre un error, pese a que la documentación y la historia de
--   usuario HU034 describían la eliminación en cascada como implementada.
-- ============================================================

BEGIN;

-- ---------- 1. Limpiar filas huérfanas previas ----------
-- Al no existir NOT NULL, podían haberse quedado registros sin dueño.
DELETE FROM accesos WHERE usuario_id IS NULL;
DELETE FROM carnet  WHERE usuario_id IS NULL;

DELETE FROM accesos a
 WHERE NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.id = a.usuario_id);

DELETE FROM carnet c
 WHERE NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.id = c.usuario_id);

-- ---------- 2. Rehacer las claves foráneas con CASCADE ----------
ALTER TABLE carnet  DROP CONSTRAINT IF EXISTS carnet_usuario_id_fkey;
ALTER TABLE accesos DROP CONSTRAINT IF EXISTS accesos_usuario_id_fkey;

ALTER TABLE carnet  ALTER COLUMN usuario_id SET NOT NULL;
ALTER TABLE accesos ALTER COLUMN usuario_id SET NOT NULL;

ALTER TABLE carnet
    ADD CONSTRAINT carnet_usuario_id_fkey
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;

ALTER TABLE accesos
    ADD CONSTRAINT accesos_usuario_id_fkey
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;

-- ---------- 3. Un solo carnet por usuario ----------
-- Refuerza la cardinalidad 1:1 del diagrama entidad-relación. Si el comando
-- falla, existen carnets duplicados: revísalos con
--   SELECT usuario_id, COUNT(*) FROM carnet GROUP BY 1 HAVING COUNT(*) > 1;
ALTER TABLE carnet DROP CONSTRAINT IF EXISTS carnet_usuario_unico;
ALTER TABLE carnet ADD CONSTRAINT carnet_usuario_unico UNIQUE (usuario_id);

-- ---------- 4. Índices de rendimiento ----------
CREATE INDEX IF NOT EXISTS idx_accesos_fecha          ON accesos (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_accesos_usuario_fecha  ON accesos (usuario_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_carnet_usuario         ON carnet (usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_correo_lower  ON usuarios (LOWER(correo));

-- ---------- 5. Restricciones de integridad ----------
ALTER TABLE usuarios ALTER COLUMN rol SET DEFAULT 'usuario';

COMMIT;
