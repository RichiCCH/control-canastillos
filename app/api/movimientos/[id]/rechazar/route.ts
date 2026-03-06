import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { movimientos, movimientosDetalle, inventario, almacenes, users } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { crearNotificacionMovimientoRechazado } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

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

    const almacenOrigenId = movimiento[0].almacenOrigenId;
    const almacenDestinoId = movimiento[0].almacenDestinoId;

    // Fetch detalles + inventory origen + notification data in parallel
    const [detalles, inventarioOrigen, notifData] = await Promise.all([
      db.select().from(movimientosDetalle).where(eq(movimientosDetalle.movimientoId, parseInt(id))),
      almacenOrigenId
        ? db.select({ productoId: inventario.productoId, cantidad: inventario.cantidad })
            .from(inventario)
            .where(eq(inventario.almacenId, almacenOrigenId))
        : Promise.resolve([]),
      almacenDestinoId
        ? Promise.all([
            db.select({ nombre: almacenes.nombre }).from(almacenes).where(eq(almacenes.id, almacenDestinoId)).limit(1),
            db.select({ nombre: users.nombre }).from(users).where(eq(users.id, finalUsuarioAprobadorId)).limit(1),
          ])
        : Promise.resolve([[], []] as [{ nombre: string }[], { nombre: string }[]]),
    ]);

    // Devolver productos al inventario del almacén de origen
    if (almacenOrigenId !== null) {
      const invMap = new Map((inventarioOrigen as { productoId: number; cantidad: number }[]).map(i => [i.productoId, i.cantidad]));
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

    // Crear notificación para el usuario solicitante
    if (almacenDestinoId !== null) {
      const [almacenDestinoRows, usuarioAprobadorRows] = notifData as [{ nombre: string }[], { nombre: string }[]];
      if (movimiento[0].usuarioSolicitanteId && usuarioAprobadorRows.length > 0 && almacenDestinoRows.length > 0) {
        await crearNotificacionMovimientoRechazado(
          parseInt(id),
          movimiento[0].usuarioSolicitanteId,
          almacenDestinoRows[0].nombre,
          usuarioAprobadorRows[0].nombre,
          observaciones
        );
      }
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
