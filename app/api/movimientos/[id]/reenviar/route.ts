import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { movimientos, movimientosDetalle, inventario, almacenes, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { crearNotificacionNuevoMovimiento } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// POST - Reenviar un movimiento rechazado (actualiza productos y cambia a pendiente)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const authUser = await requirePermission(request, 'movimientos.create');

    const { id } = await params;
    const body = await request.json();
    const { detalles, observaciones, transportadoPor } = body;

    // Validar que vengan detalles
    if (!detalles || detalles.length === 0) {
      return NextResponse.json(
        { error: 'Debe incluir al menos un producto' },
        { status: 400 }
      );
    }

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
        { error: 'Solo el solicitante puede reenviar el movimiento' },
        { status: 403 }
      );
    }

    // Verificar que el movimiento esté rechazado
    if (movimiento[0].estado !== 'rechazado') {
      return NextResponse.json(
        { error: 'Solo se pueden reenviar movimientos rechazados' },
        { status: 400 }
      );
    }

    // Validar inventario disponible en almacén de origen
    if (movimiento[0].almacenOrigenId !== null) {
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

        if (inventarioActual.length === 0 || inventarioActual[0].cantidad < detalle.cantidad) {
          return NextResponse.json(
            { error: `No hay suficiente inventario para el producto ID ${detalle.productoId}` },
            { status: 400 }
          );
        }
      }
    }

    // Eliminar detalles anteriores del movimiento
    await db
      .delete(movimientosDetalle)
      .where(eq(movimientosDetalle.movimientoId, parseInt(id)));

    // Insertar nuevos detalles
    for (const detalle of detalles) {
      await db.insert(movimientosDetalle).values({
        movimientoId: parseInt(id),
        productoId: detalle.productoId,
        cantidad: detalle.cantidad,
        precioUnitario: detalle.precioUnitario || '0',
      });
    }

    // Descontar del inventario del almacén de origen
    if (movimiento[0].almacenOrigenId !== null) {
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
          await db
            .update(inventario)
            .set({
              cantidad: inventarioActual[0].cantidad - detalle.cantidad,
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

    // Actualizar el movimiento: cambiar a pendiente y actualizar campos
    await db
      .update(movimientos)
      .set({
        estado: 'pendiente',
        observaciones: observaciones || movimiento[0].observaciones,
        transportadoPor: transportadoPor || movimiento[0].transportadoPor,
        usuarioAprobadorId: null,
        fechaAprobacion: null,
        fechaSolicitud: new Date(), // Nueva fecha de solicitud
      })
      .where(eq(movimientos.id, parseInt(id)));

    // Crear notificación para usuarios del almacén destino
    if (movimiento[0].almacenDestinoId !== null) {
      const almacenDestino = await db
        .select()
        .from(almacenes)
        .where(eq(almacenes.id, movimiento[0].almacenDestinoId))
        .limit(1);

      const usuariosDestino = await db
        .select()
        .from(users)
        .where(eq(users.almacenId, movimiento[0].almacenDestinoId));

      const usuarioSolicitante = await db
        .select()
        .from(users)
        .where(eq(users.id, authUser.id))
        .limit(1);

      if (usuarioSolicitante.length > 0 && almacenDestino.length > 0) {
        for (const usuario of usuariosDestino) {
          await crearNotificacionNuevoMovimiento(
            parseInt(id),
            usuario.id,
            almacenDestino[0].nombre,
            usuarioSolicitante[0].nombre
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Movimiento reenviado exitosamente',
    });
  } catch (error) {
    console.error('Error al reenviar movimiento:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para reenviar movimientos');
      }
    }

    return NextResponse.json(
      { error: 'Error al reenviar movimiento' },
      { status: 500 }
    );
  }
}
