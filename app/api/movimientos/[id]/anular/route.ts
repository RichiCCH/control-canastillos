import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { movimientos, movimientosDetalle, inventario, almacenes, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { crearNotificacion } from '@/lib/notifications';

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

    // Si el movimiento está pendiente, devolver productos al inventario del almacén de origen
    if (movimiento[0].estado === 'pendiente' && movimiento[0].almacenOrigenId !== null) {
      const detalles = await db
        .select()
        .from(movimientosDetalle)
        .where(eq(movimientosDetalle.movimientoId, parseInt(id)));

      for (const detalle of detalles) {
        const inventarioActual = await db
          .select()
          .from(inventario)
          .where(
            and(
              eq(inventario.productoId, detalle.productoId),
              eq(inventario.almacenId, movimiento[0].almacenOrigenId)
            )
          )
          .limit(1);

        if (inventarioActual.length > 0) {
          // Restaurar inventario en almacén de origen
          await db
            .update(inventario)
            .set({
              cantidad: inventarioActual[0].cantidad + detalle.cantidad,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(inventario.productoId, detalle.productoId),
                eq(inventario.almacenId, movimiento[0].almacenOrigenId)
              )
            );
        }
      }
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
    if (movimiento[0].usuarioAprobadorId && movimiento[0].almacenDestinoId !== null) {
      const almacenDestino = await db
        .select()
        .from(almacenes)
        .where(eq(almacenes.id, movimiento[0].almacenDestinoId))
        .limit(1);

      const usuarioSolicitante = await db
        .select()
        .from(users)
        .where(eq(users.id, authUser.id))
        .limit(1);

      if (usuarioSolicitante.length > 0 && almacenDestino.length > 0) {
        await crearNotificacion(
          movimiento[0].usuarioAprobadorId,
          parseInt(id),
          'movimiento_anulado',
          'Movimiento anulado',
          `${usuarioSolicitante[0].nombre} ha anulado el movimiento #${id} hacia ${almacenDestino[0].nombre}${observaciones ? `. Motivo: ${observaciones}` : ''}`
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
