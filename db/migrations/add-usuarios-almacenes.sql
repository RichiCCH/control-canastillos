-- Migración: tabla pivote usuarios_almacenes
-- Permite que un usuario esté asignado a múltiples almacenes

CREATE TABLE IF NOT EXISTS usuarios_almacenes (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  almacen_id  INTEGER NOT NULL REFERENCES almacenes(id) ON DELETE CASCADE,
  es_principal INTEGER NOT NULL DEFAULT 0,  -- 1 = almacén principal del usuario
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(usuario_id, almacen_id)             -- No duplicar asignaciones
);

-- Poblar la tabla con las asignaciones actuales (almacen_id actual de cada usuario)
INSERT INTO usuarios_almacenes (usuario_id, almacen_id, es_principal)
SELECT id, almacen_id, 1
FROM users
WHERE almacen_id IS NOT NULL
ON CONFLICT (usuario_id, almacen_id) DO NOTHING;

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_usuarios_almacenes_usuario ON usuarios_almacenes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_almacenes_almacen ON usuarios_almacenes(almacen_id);
