import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { movimientos, movimientosDetalle, inventario, almacenes, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { crearNotificacionMovimientoRechazado } from '@/lib/notifications';

// POST - Rechazar un movimiento
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require permission to reject movements
    const authUser = await requirePermission(request, 'movimientos.reject');

    const { id } = await params;
    const body = await request.json();
    const { usuarioAprobadorId, observaciones } = body;

    // Use authenticated user ID instead of client-provided ID
    const finalUsuarioAprobadorId = authUser.id;

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

    if (movimiento[0].estado !== 'pendiente') {
      return NextResponse.json(
        { error: 'El movimiento ya fue procesado' },
        { status: 400 }
      );
    }

    // Rechazar el movimiento
    await db
      .update(movimientos)
      .set({
        estado: 'rechazado',
        usuarioAprobadorId: finalUsuarioAprobadorId,
        fechaAprobacion: new Date(),
        observaciones: observaciones || movimiento[0].observaciones,
      })
      .where(eq(movimientos.id, parseInt(id)));

    // Obtener los detalles del movimiento
    const detalles = await db
      .select()
      .from(movimientosDetalle)
      .where(eq(movimientosDetalle.movimientoId, parseInt(id)));

    // Devolver productos al inventario del almacén de origen
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

    // Crear notificación para el usuario solicitante
    const almacenDestino = await db
      .select()
      .from(almacenes)
      .where(eq(almacenes.id, movimiento[0].almacenDestinoId))
      .limit(1);

    const usuarioAprobador = await db
      .select()
      .from(users)
      .where(eq(users.id, finalUsuarioAprobadorId))
      .limit(1);

    if (movimiento[0].usuarioSolicitanteId && usuarioAprobador.length > 0 && almacenDestino.length > 0) {
      await crearNotificacionMovimientoRechazado(
        parseInt(id),
        movimiento[0].usuarioSolicitanteId,
        almacenDestino[0].nombre,
        usuarioAprobador[0].nombre,
        observaciones
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Movimiento rechazado exitosamente',
    });
  } catch (error) {
    console.error('Error al rechazar movimiento:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para rechazar movimientos');
      }
    }

    return NextResponse.json(
      { error: 'Error al rechazar movimiento' },
      { status: 500 }
    );
  }
}
