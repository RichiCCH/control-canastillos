import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { movimientos, movimientosDetalle, inventario } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requireOwnerOrPermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const authUser = await requireAuth(request);

    const { id } = await params;
    const movimientoId = parseInt(id);
    const body = await request.json();
    const { detalles } = body;

    if (!detalles || !Array.isArray(detalles)) {
      return NextResponse.json(
        { error: 'detalles es requerido y debe ser un array' },
        { status: 400 }
      );
    }

    // Verify movement exists and is still pending
    const movimiento = await db
      .select()
      .from(movimientos)
      .where(eq(movimientos.id, movimientoId))
      .limit(1);

    if (movimiento.length === 0) {
      return NextResponse.json(
        { error: 'Movimiento no encontrado' },
        { status: 404 }
      );
    }

    if (movimiento[0].estado !== 'pendiente') {
      return NextResponse.json(
        { error: 'Solo se pueden editar movimientos pendientes' },
        { status: 400 }
      );
    }

    // Check authorization: user must own the movement or have edit permission
    const movimientoUserId = movimiento[0].usuarioSolicitanteId;
    if (!movimientoUserId || !requireOwnerOrPermission(authUser, movimientoUserId, 'movimientos.edit')) {
      return forbiddenResponse('Solo puedes editar tus propios movimientos o necesitas permiso de edición');
    }

    const almacenOrigenId = movimiento[0].almacenOrigenId;

    // For each detail, restore old inventory and apply new quantity
    if (almacenOrigenId !== null) {
      for (const detalle of detalles) {
        // Get current detail
        const currentDetail = await db
          .select()
          .from(movimientosDetalle)
          .where(eq(movimientosDetalle.id, detalle.id))
          .limit(1);

        if (currentDetail.length === 0) continue;

        const oldCantidad = currentDetail[0].cantidad;
        const newCantidad = detalle.cantidad;
        const productoId = currentDetail[0].productoId;

        if (oldCantidad !== newCantidad) {
          // Get current inventory
          const inventarioActual = await db
            .select()
            .from(inventario)
            .where(
              and(
                eq(inventario.productoId, productoId),
                eq(inventario.almacenId, almacenOrigenId)
              )
            )
            .limit(1);

          if (inventarioActual.length > 0) {
            // Restore old quantity and subtract new quantity
            const adjustedCantidad = inventarioActual[0].cantidad + oldCantidad - newCantidad;

            if (adjustedCantidad < 0) {
              return NextResponse.json(
                { error: `Stock insuficiente para producto ID ${productoId}` },
                { status: 400 }
              );
            }

            // Update inventory
            await db
              .update(inventario)
              .set({
                cantidad: adjustedCantidad,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(inventario.productoId, productoId),
                  eq(inventario.almacenId, almacenOrigenId)
                )
              );
          }

          // Update movement detail
          await db
            .update(movimientosDetalle)
            .set({
              cantidad: newCantidad,
            })
            .where(eq(movimientosDetalle.id, detalle.id));
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Movimiento actualizado exitosamente',
    });
  } catch (error) {
    console.error('Error al actualizar movimiento:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse();
      }
    }

    return NextResponse.json(
      { error: 'Error al actualizar movimiento' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const authUser = await requireAuth(request);

    const { id } = await params;
    const movimientoId = parseInt(id);

    // Verify movement exists and is still pending
    const movimiento = await db
      .select()
      .from(movimientos)
      .where(eq(movimientos.id, movimientoId))
      .limit(1);

    if (movimiento.length === 0) {
      return NextResponse.json(
        { error: 'Movimiento no encontrado' },
        { status: 404 }
      );
    }

    if (movimiento[0].estado !== 'pendiente') {
      return NextResponse.json(
        { error: 'Solo se pueden cancelar movimientos pendientes' },
        { status: 400 }
      );
    }

    // Check authorization: user must own the movement or have delete permission
    const deleteMovimientoUserId = movimiento[0].usuarioSolicitanteId;
    if (!deleteMovimientoUserId || !requireOwnerOrPermission(authUser, deleteMovimientoUserId, 'movimientos.delete')) {
      return forbiddenResponse('Solo puedes cancelar tus propios movimientos o necesitas permiso de eliminación');
    }

    const almacenOrigenId = movimiento[0].almacenOrigenId;

    // Get all details to restore inventory
    const detalles = await db
      .select()
      .from(movimientosDetalle)
      .where(eq(movimientosDetalle.movimientoId, movimientoId));

    // Restore inventory for each product
    if (almacenOrigenId !== null) {
      for (const detalle of detalles) {
        const inventarioActual = await db
          .select()
          .from(inventario)
          .where(
            and(
              eq(inventario.productoId, detalle.productoId),
              eq(inventario.almacenId, almacenOrigenId)
            )
          )
          .limit(1);

        if (inventarioActual.length > 0) {
          // Restore the quantity
          await db
            .update(inventario)
            .set({
              cantidad: inventarioActual[0].cantidad + detalle.cantidad,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(inventario.productoId, detalle.productoId),
                eq(inventario.almacenId, almacenOrigenId)
              )
            );
        }
      }
    }

    // Delete movement details
    await db
      .delete(movimientosDetalle)
      .where(eq(movimientosDetalle.movimientoId, movimientoId));

    // Delete movement
    await db.delete(movimientos).where(eq(movimientos.id, movimientoId));

    return NextResponse.json({
      success: true,
      message: 'Movimiento cancelado exitosamente',
    });
  } catch (error) {
    console.error('Error al cancelar movimiento:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse();
      }
    }

    return NextResponse.json(
      { error: 'Error al cancelar movimiento' },
      { status: 500 }
    );
  }
}
