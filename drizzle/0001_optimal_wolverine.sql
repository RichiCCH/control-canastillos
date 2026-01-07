CREATE TYPE "public"."tipo_movimiento" AS ENUM('salida', 'entrada', 'baja');--> statement-breakpoint
ALTER TABLE "movimientos" ALTER COLUMN "almacen_origen_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "movimientos" ALTER COLUMN "almacen_destino_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "tipo_movimiento" "tipo_movimiento" DEFAULT 'salida' NOT NULL;--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "motivo" varchar(100);--> statement-breakpoint
ALTER TABLE "movimientos" ADD COLUMN "proveedor_responsable" varchar(255);