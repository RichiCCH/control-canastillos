import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { movimientos, movimientosDetalle, inventario, almacenes, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { crearNotificacionMovimientoAprobado } from '@/lib/notifications';

// POST - Aprobar un movimiento
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require permission to approve movements
    const authUser = await requirePermission(request, 'movimientos.approve');

    const { id } = await params;
    const body = await request.json();
    const { usuarioAprobadorId } = body;

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

    // Aprobar el movimiento
    await db
      .update(movimientos)
      .set({
        estado: 'aprobado',
        usuarioAprobadorId: finalUsuarioAprobadorId,
        fechaAprobacion: new Date(),
      })
      .where(eq(movimientos.id, parseInt(id)));

    // Obtener los detalles del movimiento
    const detalles = await db
      .select()
      .from(movimientosDetalle)
      .where(eq(movimientosDetalle.movimientoId, parseInt(id)));

    // Agregar productos al inventario del almacén destino
    if (movimiento[0].almacenDestinoId !== null) {
      for (const detalle of detalles) {
        // Verificar si ya existe inventario para este producto en el almacén destino
        const inventarioExistente = await db
          .select()
          .from(inventario)
          .where(
            and(
              eq(inventario.productoId, detalle.productoId),
              eq(inventario.almacenId, movimiento[0].almacenDestinoId)
            )
          )
          .limit(1);

      if (inventarioExistente.length > 0) {
        // Actualizar inventario existente
        await db
          .update(inventario)
          .set({
            cantidad: inventarioExistente[0].cantidad + detalle.cantidad,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventario.productoId, detalle.productoId),
              eq(inventario.almacenId, movimiento[0].almacenDestinoId)
            )
          );
        } else {
          // Crear nuevo registro de inventario
          await db
            .insert(inventario)
            .values({
              productoId: detalle.productoId,
              almacenId: movimiento[0].almacenDestinoId,
              cantidad: detalle.cantidad,
            });
        }
      }
    }

    // Crear notificación para el usuario solicitante
    if (movimiento[0].almacenDestinoId !== null) {
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
        await crearNotificacionMovimientoAprobado(
          parseInt(id),
          movimiento[0].usuarioSolicitanteId,
          almacenDestino[0].nombre,
          usuarioAprobador[0].nombre
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Movimiento aprobado exitosamente',
    });
  } catch (error) {
    console.error('Error al aprobar movimiento:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para aprobar movimientos');
      }
    }

    return NextResponse.json(
      { error: 'Error al aprobar movimiento' },
      { status: 500 }
    );
  }
}
