CREATE TYPE "public"."estado_movimiento" AS ENUM('pendiente', 'aprobado', 'rechazado', 'anulado');--> statement-breakpoint
CREATE TYPE "public"."rol_usuario" AS ENUM('admin', 'supervisor', 'operador');--> statement-breakpoint
CREATE TYPE "public"."tipo_producto" AS ENUM('canastillo_negro', 'canastillo_color', 'cooler', 'caja');--> statement-breakpoint
CREATE TABLE "almacenes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"ubicacion" varchar(255),
	"descripcion" text,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "almacenes_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "inventario" (
	"id" serial PRIMARY KEY NOT NULL,
	"producto_id" integer NOT NULL,
	"almacen_id" integer NOT NULL,
	"cantidad" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimientos" (
	"id" serial PRIMARY KEY NOT NULL,
	"almacen_origen_id" integer NOT NULL,
	"almacen_destino_id" integer NOT NULL,
	"usuario_solicitante_id" integer,
	"usuario_aprobador_id" integer,
	"estado" "estado_movimiento" DEFAULT 'pendiente' NOT NULL,
	"observaciones" text,
	"transportado_por" varchar(255),
	"fecha_solicitud" timestamp DEFAULT now() NOT NULL,
	"fecha_aprobacion" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimientos_detalle" (
	"id" serial PRIMARY KEY NOT NULL,
	"movimiento_id" integer NOT NULL,
	"producto_id" integer NOT NULL,
	"cantidad" integer NOT NULL,
	"precio_unitario" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"movimiento_id" integer,
	"tipo" varchar(50) NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"mensaje" text NOT NULL,
	"leida" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" varchar(50) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"tipo" "tipo_producto" NOT NULL,
	"descripcion" text,
	"unidad_medida" varchar(20) DEFAULT 'unidad',
	"precio_base" numeric(10, 2),
	"stock_minimo" integer DEFAULT 0,
	"activo" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "productos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"email" varchar(255),
	"password" varchar(255),
	"almacen_id" integer,
	"rol" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_almacen_id_almacenes_id_fk" FOREIGN KEY ("almacen_id") REFERENCES "public"."almacenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_almacen_origen_id_almacenes_id_fk" FOREIGN KEY ("almacen_origen_id") REFERENCES "public"."almacenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_almacen_destino_id_almacenes_id_fk" FOREIGN KEY ("almacen_destino_id") REFERENCES "public"."almacenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_usuario_solicitante_id_users_id_fk" FOREIGN KEY ("usuario_solicitante_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_usuario_aprobador_id_users_id_fk" FOREIGN KEY ("usuario_aprobador_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_detalle" ADD CONSTRAINT "movimientos_detalle_movimiento_id_movimientos_id_fk" FOREIGN KEY ("movimiento_id") REFERENCES "public"."movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_detalle" ADD CONSTRAINT "movimientos_detalle_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_users_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_movimiento_id_movimientos_id_fk" FOREIGN KEY ("movimiento_id") REFERENCES "public"."movimientos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_almacen_id_almacenes_id_fk" FOREIGN KEY ("almacen_id") REFERENCES "public"."almacenes"("id") ON DELETE no action ON UPDATE no action;