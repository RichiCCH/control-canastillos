-- Performance indexes for critical query paths
-- Run: npx drizzle-kit push (or apply manually)

-- usuariosAlmacenes: lookups by usuario and almacen
CREATE INDEX IF NOT EXISTS "idx_usuarios_almacenes_usuario_id" ON "usuarios_almacenes" ("usuario_id");
CREATE INDEX IF NOT EXISTS "idx_usuarios_almacenes_almacen_id" ON "usuarios_almacenes" ("almacen_id");

-- inventario: composite unique (producto+almacen) is the most queried pattern
CREATE UNIQUE INDEX IF NOT EXISTS "idx_inventario_producto_almacen" ON "inventario" ("producto_id","almacen_id");
CREATE INDEX IF NOT EXISTS "idx_inventario_almacen_id" ON "inventario" ("almacen_id");

-- movimientos: estado filter is used in every list query
CREATE INDEX IF NOT EXISTS "idx_movimientos_estado" ON "movimientos" ("estado");
CREATE INDEX IF NOT EXISTS "idx_movimientos_almacen_destino_estado" ON "movimientos" ("almacen_destino_id","estado");
CREATE INDEX IF NOT EXISTS "idx_movimientos_almacen_origen_id" ON "movimientos" ("almacen_origen_id");
CREATE INDEX IF NOT EXISTS "idx_movimientos_usuario_solicitante_id" ON "movimientos" ("usuario_solicitante_id");
CREATE INDEX IF NOT EXISTS "idx_movimientos_tipo_movimiento" ON "movimientos" ("tipo_movimiento");
CREATE INDEX IF NOT EXISTS "idx_movimientos_created_at" ON "movimientos" ("created_at");

-- movimientos_detalle: always joined by movimiento_id
CREATE INDEX IF NOT EXISTS "idx_movimientos_detalle_movimiento_id" ON "movimientos_detalle" ("movimiento_id");
CREATE INDEX IF NOT EXISTS "idx_movimientos_detalle_producto_id" ON "movimientos_detalle" ("producto_id");

-- notificaciones: always filtered by usuario_id + leida
CREATE INDEX IF NOT EXISTS "idx_notificaciones_usuario_id" ON "notificaciones" ("usuario_id");
CREATE INDEX IF NOT EXISTS "idx_notificaciones_usuario_leida" ON "notificaciones" ("usuario_id","leida");
