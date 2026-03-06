import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { movimientos, movimientosDetalle, inventario, almacenes, users } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { crearNotificacion } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// POST - Anular un movimiento (sólo el solicitante puede anular)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const authUser = await requirePermission(request, 'movimientos.create');

    const { id } = await params;
    const body = await request.json();
    const { observaciones } = body;

    // Obtener el movimiento
    const movimiento = await db
      .select()
      .from(movimientos)
      .where(eq(movimientos.id, parseInt(id)))
      .limit(1);

    if (movimiento.length === 0) {
      return NextResponse.json(
        { error: 'Movimiento no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario sea el solicitante del movimiento
    if (movimiento[0].usuarioSolicitanteId !== authUser.id) {
      return NextResponse.json(
        { error: 'Solo el solicitante puede anular el movimiento' },
        { status: 403 }
      );
    }

    // Verificar que el movimiento esté en estado pendiente o rechazado
    if (movimiento[0].estado !== 'pendiente' && movimiento[0].estado !== 'rechazado') {
      return NextResponse.json(
        { error: 'Solo se pueden anular movimientos pendientes o rechazados' },
        { status: 400 }
      );
    }

    const almacenOrigenId = movimiento[0].almacenOrigenId;
    const almacenDestinoId = movimiento[0].almacenDestinoId;
    const esPendiente = movimiento[0].estado === 'pendiente';

    // Parallel: fetch detalles (if needed) + notification data + update movimiento
    const [detalles, notifData] = await Promise.all([
      esPendiente && almacenOrigenId !== null
        ? db.select().from(movimientosDetalle).where(eq(movimientosDetalle.movimientoId, parseInt(id)))
        : Promise.resolve([]),
      movimiento[0].usuarioAprobadorId && almacenDestinoId !== null
        ? Promise.all([
            db.select({ nombre: almacenes.nombre }).from(almacenes).where(eq(almacenes.id, almacenDestinoId)).limit(1),
            db.select({ nombre: users.nombre }).from(users).where(eq(users.id, authUser.id)).limit(1),
          ])
        : Promise.resolve([[], []] as [{ nombre: string }[], { nombre: string }[]]),
    ]);

    // Si el movimiento está pendiente, devolver productos al inventario del almacén de origen
    if (esPendiente && almacenOrigenId !== null && detalles.length > 0) {
      const prodIds = detalles.map(d => d.productoId);
      const inventarioOrigen = await db
        .select({ productoId: inventario.productoId, cantidad: inventario.cantidad })
        .from(inventario)
        .where(and(eq(inventario.almacenId, almacenOrigenId), inArray(inventario.productoId, prodIds)));
      const invMap = new Map(inventarioOrigen.map(i => [i.productoId, i.cantidad]));
      const now = new Date();
      await Promise.all(
        detalles
          .filter(d => invMap.has(d.productoId))
          .map(detalle =>
            db.update(inventario)
              .set({ cantidad: invMap.get(detalle.productoId)! + detalle.cantidad, updatedAt: now })
              .where(and(eq(inventario.productoId, detalle.productoId), eq(inventario.almacenId, almacenOrigenId)))
          )
      );
    }

    // Anular el movimiento
    await db
      .update(movimientos)
      .set({
        estado: 'anulado',
        observaciones: observaciones || movimiento[0].observaciones,
      })
      .where(eq(movimientos.id, parseInt(id)));

    // Crear notificación para el aprobador si existe
    if (movimiento[0].usuarioAprobadorId && almacenDestinoId !== null) {
      const [almacenDestinoRows, usuarioSolicitanteRows] = notifData as [{ nombre: string }[], { nombre: string }[]];
      if (usuarioSolicitanteRows.length > 0 && almacenDestinoRows.length > 0) {
        await crearNotificacion(
          movimiento[0].usuarioAprobadorId,
          parseInt(id),
          'movimiento_anulado',
          'Movimiento anulado',
          `${usuarioSolicitanteRows[0].nombre} ha anulado el movimiento #${id} hacia ${almacenDestinoRows[0].nombre}${observaciones ? `. Motivo: ${observaciones}` : ''}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Movimiento anulado exitosamente',
    });
  } catch (error) {
    console.error('Error al anular movimiento:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para anular movimientos');
      }
    }

    return NextResponse.json(
      { error: 'Error al anular movimiento' },
      { status: 500 }
    );
  }
}
