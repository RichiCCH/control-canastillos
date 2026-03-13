import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { movimientos, almacenes, users, movimientosDetalle, productos } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const almacenesDestino = almacenes;
const almacenesOrigen = almacenes;
const usersAprobador = users;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get('usuarioId');

    if (!usuarioId) {
      return NextResponse.json({ error: 'usuarioId es requerido' }, { status: 400 });
    }

    const uid = parseInt(usuarioId);

    // Una sola query con todos los JOINs necesarios
    const rows = await db
      .select({
        id: movimientos.id,
        estado: movimientos.estado,
        observaciones: movimientos.observaciones,
        transportadoPor: movimientos.transportadoPor,
        fechaSolicitud: movimientos.fechaSolicitud,
        fechaAprobacion: movimientos.fechaAprobacion,
        almacenDestinoId: almacenesDestino.id,
        almacenDestinoNombre: almacenesDestino.nombre,
        almacenOrigenId: movimientos.almacenOrigenId,
        aprobadorId: usersAprobador.id,
        aprobadorNombre: usersAprobador.nombre,
      })
      .from(movimientos)
      .leftJoin(almacenesDestino, eq(movimientos.almacenDestinoId, almacenesDestino.id))
      .leftJoin(usersAprobador, eq(movimientos.usuarioAprobadorId, usersAprobador.id))
      .where(eq(movimientos.usuarioSolicitanteId, uid))
      .orderBy(movimientos.fechaSolicitud);

    if (rows.length === 0) return NextResponse.json([]);

    // Todos los detalles de todos los movimientos en una sola query
    const movIds = rows.map(r => r.id);
    const detallesRows = await db
      .select({
        movimientoId: movimientosDetalle.movimientoId,
        id: movimientosDetalle.id,
        cantidad: movimientosDetalle.cantidad,
        productoId: productos.id,
        productoCodigo: productos.codigo,
        productoNombre: productos.nombre,
        productoTipo: productos.tipo,
        productoUnidadMedida: productos.unidadMedida,
      })
      .from(movimientosDetalle)
      .innerJoin(productos, eq(movimientosDetalle.productoId, productos.id))
      .where(inArray(movimientosDetalle.movimientoId, movIds));

    // Agrupar detalles por movimientoId
    const detallesPorMov = new Map<number, typeof detallesRows>();
    for (const d of detallesRows) {
      if (!detallesPorMov.has(d.movimientoId!)) detallesPorMov.set(d.movimientoId!, []);
      detallesPorMov.get(d.movimientoId!)!.push(d);
    }

    const result = rows.map(mov => ({
      id: mov.id,
      estado: mov.estado,
      observaciones: mov.observaciones,
      transportadoPor: mov.transportadoPor,
      fechaSolicitud: mov.fechaSolicitud,
      fechaAprobacion: mov.fechaAprobacion,
      almacenDestino: mov.almacenDestinoId ? { id: mov.almacenDestinoId, nombre: mov.almacenDestinoNombre! } : null,
      almacenOrigenId: mov.almacenOrigenId,
      usuarioAprobador: mov.aprobadorId ? { id: mov.aprobadorId, nombre: mov.aprobadorNombre! } : null,
      detalles: (detallesPorMov.get(mov.id) || []).map(d => ({
        id: d.id,
        cantidad: d.cantidad,
        producto: {
          id: d.productoId!,
          codigo: d.productoCodigo!,
          nombre: d.productoNombre!,
          tipo: d.productoTipo!,
          unidadMedida: d.productoUnidadMedida!,
        },
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al obtener movimientos del usuario:', error);
    return NextResponse.json({ error: 'Error al obtener movimientos del usuario' }, { status: 500 });
  }
}
