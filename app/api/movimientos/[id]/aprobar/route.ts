import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { movimientos, movimientosDetalle, inventario, almacenes, users } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { crearNotificacionMovimientoAprobado } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

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

    // Obtener detalles + inventario destino en paralelo
    const almacenDestinoId = movimiento[0].almacenDestinoId;
    const [detalles, inventarioDestino, notifData] = await Promise.all([
      db.select().from(movimientosDetalle).where(eq(movimientosDetalle.movimientoId, parseInt(id))),
      almacenDestinoId
        ? db.select({ productoId: inventario.productoId, cantidad: inventario.cantidad })
            .from(inventario)
            .where(eq(inventario.almacenId, almacenDestinoId))
        : Promise.resolve([]),
      almacenDestinoId
        ? Promise.all([
            db.select({ nombre: almacenes.nombre }).from(almacenes).where(eq(almacenes.id, almacenDestinoId)).limit(1),
            db.select({ nombre: users.nombre }).from(users).where(eq(users.id, finalUsuarioAprobadorId)).limit(1),
          ])
        : Promise.resolve([[], []] as [{ nombre: string }[], { nombre: string }[]]),
    ]);

    // Agregar productos al inventario del almacén destino
    if (almacenDestinoId !== null) {
      const invMap = new Map((inventarioDestino as { productoId: number; cantidad: number }[]).map(i => [i.productoId, i.cantidad]));
      const now = new Date();
      await Promise.all(
        detalles.map(async (detalle) => {
          if (invMap.has(detalle.productoId)) {
            await db.update(inventario)
              .set({ cantidad: invMap.get(detalle.productoId)! + detalle.cantidad, updatedAt: now })
              .where(and(eq(inventario.productoId, detalle.productoId), eq(inventario.almacenId, almacenDestinoId)));
          } else {
            await db.insert(inventario).values({ productoId: detalle.productoId, almacenId: almacenDestinoId, cantidad: detalle.cantidad });
          }
        })
      );
    }

    // Crear notificación para el usuario solicitante
    if (almacenDestinoId !== null) {
      const [almacenDestinoRows, usuarioAprobadorRows] = notifData as [{ nombre: string }[], { nombre: string }[]];
      if (movimiento[0].usuarioSolicitanteId && usuarioAprobadorRows.length > 0 && almacenDestinoRows.length > 0) {
        await crearNotificacionMovimientoAprobado(
          parseInt(id),
          movimiento[0].usuarioSolicitanteId,
          almacenDestinoRows[0].nombre,
          usuarioAprobadorRows[0].nombre
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
