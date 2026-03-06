import { pgTable, serial, varchar, timestamp, pgEnum, integer, text, decimal, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum para el tipo de productos
export const tipoProductoEnum = pgEnum('tipo_producto', [
  'canastillo_negro',
  'canastillo_color',
  'cooler',
  'caja'
]);

// Enum para el tipo de movimiento
export const tipoMovimientoEnum = pgEnum('tipo_movimiento', [
  'salida',    // Movimiento normal entre almacenes
  'entrada',   // Compra, devolución, ajuste de entrada
  'baja'       // Baja por daño, pérdida, merma
]);

// Enum para el estado de los movimientos/solicitudes
export const estadoMovimientoEnum = pgEnum('estado_movimiento', [
  'pendiente',
  'aprobado',
  'rechazado',
  'anulado'
]);

// Enum para roles de usuario
export const rolUsuarioEnum = pgEnum('rol_usuario', [
  'admin',
  'supervisor',
  'operador'
]);

// Tabla de almacenes
export const almacenes = pgTable('almacenes', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull().unique(),
  ubicacion: varchar('ubicacion', { length: 255 }),
  descripcion: text('descripcion'),
  activo: integer('activo').default(1).notNull(), // 1 = activo, 0 = inactivo
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tabla de usuarios (preparada para autenticación futura)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  password: varchar('password', { length: 255 }),
  almacenId: integer('almacen_id').references(() => almacenes.id), // Almacén principal/defecto
  rol: varchar('rol', { length: 50 }),
  activo: integer('activo').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tabla pivote: un usuario puede pertenecer a múltiples almacenes
export const usuariosAlmacenes = pgTable('usuarios_almacenes', {
  id: serial('id').primaryKey(),
  usuarioId: integer('usuario_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  almacenId: integer('almacen_id').references(() => almacenes.id, { onDelete: 'cascade' }).notNull(),
  esPrincipal: integer('es_principal').default(0).notNull(), // 1 = almacén principal del usuario
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_usuarios_almacenes_usuario_id').on(t.usuarioId),
  index('idx_usuarios_almacenes_almacen_id').on(t.almacenId),
]);

// Tabla de productos (catálogo de tipos de productos)
export const productos = pgTable('productos', {
  id: serial('id').primaryKey(),
  codigo: varchar('codigo', { length: 50 }).notNull().unique(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  tipo: tipoProductoEnum('tipo').notNull(),
  descripcion: text('descripcion'),
  unidadMedida: varchar('unidad_medida', { length: 20 }).default('unidad'),
  precioBase: decimal('precio_base', { precision: 10, scale: 2 }),
  stockMinimo: integer('stock_minimo').default(0),
  activo: integer('activo').default(1).notNull(), // 1 = activo, 0 = inactivo
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tabla de inventario (stock de productos por almacén)
export const inventario = pgTable('inventario', {
  id: serial('id').primaryKey(),
  productoId: integer('producto_id').references(() => productos.id).notNull(),
  almacenId: integer('almacen_id').references(() => almacenes.id).notNull(),
  cantidad: integer('cantidad').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('idx_inventario_producto_almacen').on(t.productoId, t.almacenId),
  index('idx_inventario_almacen_id').on(t.almacenId),
]);

// Tabla de movimientos (cabecera del movimiento)
export const movimientos = pgTable('movimientos', {
  id: serial('id').primaryKey(),
  tipoMovimiento: tipoMovimientoEnum('tipo_movimiento').default('salida').notNull(),
  almacenOrigenId: integer('almacen_origen_id').references(() => almacenes.id),
  almacenDestinoId: integer('almacen_destino_id').references(() => almacenes.id),
  usuarioSolicitanteId: integer('usuario_solicitante_id').references(() => users.id),
  usuarioAprobadorId: integer('usuario_aprobador_id').references(() => users.id),
  estado: estadoMovimientoEnum('estado').default('pendiente').notNull(),
  motivo: varchar('motivo', { length: 100 }), // Para ajustes: "Compra", "Baja por daño", etc.
  proveedorResponsable: varchar('proveedor_responsable', { length: 255 }), // Opcional
  observaciones: text('observaciones'),
  transportadoPor: varchar('transportado_por', { length: 255 }),
  fechaSolicitud: timestamp('fecha_solicitud').defaultNow().notNull(),
  fechaAprobacion: timestamp('fecha_aprobacion'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_movimientos_estado').on(t.estado),
  index('idx_movimientos_almacen_destino_estado').on(t.almacenDestinoId, t.estado),
  index('idx_movimientos_almacen_origen_id').on(t.almacenOrigenId),
  index('idx_movimientos_usuario_solicitante_id').on(t.usuarioSolicitanteId),
  index('idx_movimientos_tipo_movimiento').on(t.tipoMovimiento),
  index('idx_movimientos_created_at').on(t.createdAt),
]);

// Tabla de detalle de movimientos (items del movimiento)
export const movimientosDetalle = pgTable('movimientos_detalle', {
  id: serial('id').primaryKey(),
  movimientoId: integer('movimiento_id').references(() => movimientos.id).notNull(),
  productoId: integer('producto_id').references(() => productos.id).notNull(),
  cantidad: integer('cantidad').notNull(),
  precioUnitario: decimal('precio_unitario', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_movimientos_detalle_movimiento_id').on(t.movimientoId),
  index('idx_movimientos_detalle_producto_id').on(t.productoId),
]);

// Tabla de notificaciones
export const notificaciones = pgTable('notificaciones', {
  id: serial('id').primaryKey(),
  usuarioId: integer('usuario_id').references(() => users.id).notNull(),
  movimientoId: integer('movimiento_id').references(() => movimientos.id),
  tipo: varchar('tipo', { length: 50 }).notNull(), // 'nuevo_movimiento', 'movimiento_aprobado', 'movimiento_rechazado'
  titulo: varchar('titulo', { length: 255 }).notNull(),
  mensaje: text('mensaje').notNull(),
  leida: boolean('leida').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('idx_notificaciones_usuario_id').on(t.usuarioId),
  index('idx_notificaciones_usuario_leida').on(t.usuarioId, t.leida),
]);

// Relaciones
export const almacenesRelations = relations(almacenes, ({ many }) => ({
  usuarios: many(users),
  inventario: many(inventario),
  movimientosOrigen: many(movimientos, { relationName: 'almacen_origen' }),
  movimientosDestino: many(movimientos, { relationName: 'almacen_destino' }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  almacen: one(almacenes, {
    fields: [users.almacenId],
    references: [almacenes.id],
  }),
  almacenesAsignados: many(usuariosAlmacenes),
  movimientosSolicitados: many(movimientos, { relationName: 'usuario_solicitante' }),
  movimientosAprobados: many(movimientos, { relationName: 'usuario_aprobador' }),
  notificaciones: many(notificaciones),
}));

export const usuariosAlmacenesRelations = relations(usuariosAlmacenes, ({ one }) => ({
  usuario: one(users, { fields: [usuariosAlmacenes.usuarioId], references: [users.id] }),
  almacen: one(almacenes, { fields: [usuariosAlmacenes.almacenId], references: [almacenes.id] }),
}));

export const productosRelations = relations(productos, ({ many }) => ({
  inventario: many(inventario),
  movimientosDetalle: many(movimientosDetalle),
}));

export const inventarioRelations = relations(inventario, ({ one }) => ({
  producto: one(productos, {
    fields: [inventario.productoId],
    references: [productos.id],
  }),
  almacen: one(almacenes, {
    fields: [inventario.almacenId],
    references: [almacenes.id],
  }),
}));

export const movimientosRelations = relations(movimientos, ({ one, many }) => ({
  almacenOrigen: one(almacenes, {
    fields: [movimientos.almacenOrigenId],
    references: [almacenes.id],
    relationName: 'almacen_origen',
  }),
  almacenDestino: one(almacenes, {
    fields: [movimientos.almacenDestinoId],
    references: [almacenes.id],
    relationName: 'almacen_destino',
  }),
  usuarioSolicitante: one(users, {
    fields: [movimientos.usuarioSolicitanteId],
    references: [users.id],
    relationName: 'usuario_solicitante',
  }),
  usuarioAprobador: one(users, {
    fields: [movimientos.usuarioAprobadorId],
    references: [users.id],
    relationName: 'usuario_aprobador',
  }),
  detalles: many(movimientosDetalle),
}));

export const movimientosDetalleRelations = relations(movimientosDetalle, ({ one }) => ({
  movimiento: one(movimientos, {
    fields: [movimientosDetalle.movimientoId],
    references: [movimientos.id],
  }),
  producto: one(productos, {
    fields: [movimientosDetalle.productoId],
    references: [productos.id],
  }),
}));

export const notificacionesRelations = relations(notificaciones, ({ one }) => ({
  usuario: one(users, {
    fields: [notificaciones.usuarioId],
    references: [users.id],
  }),
  movimiento: one(movimientos, {
    fields: [notificaciones.movimientoId],
    references: [movimientos.id],
  }),
}));

// Tabla de suscripciones push (Web Push API)
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  usuarioId: integer('usuario_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  usuario: one(users, {
    fields: [pushSubscriptions.usuarioId],
    references: [users.id],
  }),
}));

// Tipos TypeScript inferidos del esquema
export type Almacen = typeof almacenes.$inferSelect;
export type NewAlmacen = typeof almacenes.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Producto = typeof productos.$inferSelect;
export type NewProducto = typeof productos.$inferInsert;

export type Inventario = typeof inventario.$inferSelect;
export type NewInventario = typeof inventario.$inferInsert;

export type Movimiento = typeof movimientos.$inferSelect;
export type NewMovimiento = typeof movimientos.$inferInsert;

export type MovimientoDetalle = typeof movimientosDetalle.$inferSelect;
export type NewMovimientoDetalle = typeof movimientosDetalle.$inferInsert;

export type Notificacion = typeof notificaciones.$inferSelect;
export type NewNotificacion = typeof notificaciones.$inferInsert;
