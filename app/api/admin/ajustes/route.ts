import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { movimientos, movimientosDetalle, inventario, productos, almacenes } from '@/db/schema';
import { eq, desc, sql, and, or, isNull } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { auth } from '@/lib/auth-config';

export const dynamic = 'force-dynamic';

// GET - Obtener todos los ajustes de inventario
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'admin.ajustes.view');

    // Obtener ajustes (movimientos de tipo 'entrada' o 'baja')
    const ajustes = await db
      .select({
        id: movimientos.id,
        tipoMovimiento: movimientos.tipoMovimiento,
        motivo: movimientos.motivo,
        proveedorResponsable: movimientos.proveedorResponsable,
        observaciones: movimientos.observaciones,
        almacenOrigenId: movimientos.almacenOrigenId,
        almacenDestinoId: movimientos.almacenDestinoId,
        estado: movimientos.estado,
        fechaSolicitud: movimientos.fechaSolicitud,
        fechaAprobacion: movimientos.fechaAprobacion,
        usuarioSolicitanteId: movimientos.usuarioSolicitanteId,
      })
      .from(movimientos)
      .where(
        or(
          eq(movimientos.tipoMovimiento, 'entrada'),
          eq(movimientos.tipoMovimiento, 'baja')
        )
      )
      .orderBy(desc(movimientos.createdAt));

    // Obtener detalles y datos relacionados para cada ajuste
    const ajustesConDetalles = await Promise.all(
      ajustes.map(async (ajuste) => {
        // Obtener detalles de productos
        const detalles = await db
          .select({
            id: movimientosDetalle.id,
            productoId: movimientosDetalle.productoId,
            cantidad: movimientosDetalle.cantidad,
            nombreProducto: productos.nombre,
            codigoProducto: productos.codigo,
            tipoProducto: productos.tipo,
          })
          .from(movimientosDetalle)
          .innerJoin(productos, eq(movimientosDetalle.productoId, productos.id))
          .where(eq(movimientosDetalle.movimientoId, ajuste.id));

        // Obtener nombre del almacén
        let almacenNombre = null;
        const almacenId = ajuste.tipoMovimiento === 'entrada'
          ? ajuste.almacenDestinoId
          : ajuste.almacenOrigenId;

        if (almacenId) {
          const almacen = await db
            .select({ nombre: almacenes.nombre })
            .from(almacenes)
            .where(eq(almacenes.id, almacenId))
            .limit(1);
          almacenNombre = almacen[0]?.nombre || null;
        }

        return {
          ...ajuste,
          almacenId,
          almacenNombre,
          detalles,
        };
      })
    );

    return NextResponse.json(ajustesConDetalles);
  } catch (error) {
    console.error('Error al obtener ajustes:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para ver ajustes de inventario');
      }
    }

    return NextResponse.json(
      { error: 'Error al obtener ajustes' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo ajuste de inventario
export async function POST(request: NextRequest) {
  try {
    await requirePermission(request, 'admin.ajustes.create');

    const session = await auth();
    const usuarioId = (session?.user as any)?.id;

    if (!usuarioId) {
      return NextResponse.json(
        { error: 'Usuario no identificado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      tipoMovimiento,
      motivo,
      proveedorResponsable,
      observaciones,
      almacenId,
      productos: productosAjuste
    } = body;

    // Validaciones
    if (!tipoMovimiento || !['entrada', 'baja'].includes(tipoMovimiento)) {
      return NextResponse.json(
        { error: 'Tipo de movimiento inválido' },
        { status: 400 }
      );
    }

    if (!motivo || motivo.trim() === '') {
      return NextResponse.json(
        { error: 'El motivo es requerido' },
        { status: 400 }
      );
    }

    if (!almacenId) {
      return NextResponse.json(
        { error: 'Debe seleccionar un almacén' },
        { status: 400 }
      );
    }

    if (!productosAjuste || productosAjuste.length === 0) {
      return NextResponse.json(
        { error: 'Debe agregar al menos un producto' },
        { status: 400 }
      );
    }

    // Validar que todas las cantidades sean válidas
    for (const prod of productosAjuste) {
      if (!prod.productoId || !prod.cantidad || prod.cantidad <= 0) {
        return NextResponse.json(
          { error: 'Todos los productos deben tener cantidad válida' },
          { status: 400 }
        );
      }

      // Si es baja, verificar que hay suficiente stock
      if (tipoMovimiento === 'baja') {
        const stockActual = await db
          .select({ cantidad: inventario.cantidad })
          .from(inventario)
          .where(
            and(
              eq(inventario.almacenId, almacenId),
              eq(inventario.productoId, prod.productoId)
            )
          )
          .limit(1);

        const cantidadDisponible = stockActual[0]?.cantidad || 0;

        if (cantidadDisponible < prod.cantidad) {
          const producto = await db
            .select({ nombre: productos.nombre })
            .from(productos)
            .where(eq(productos.id, prod.productoId))
            .limit(1);

          return NextResponse.json(
            {
              error: `Stock insuficiente de ${producto[0]?.nombre}. Disponible: ${cantidadDisponible}, Solicitado: ${prod.cantidad}`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Crear movimiento
    const nuevoMovimiento = await db
      .insert(movimientos)
      .values({
        tipoMovimiento,
        motivo,
        proveedorResponsable: proveedorResponsable || null,
        observaciones: observaciones || null,
        almacenOrigenId: tipoMovimiento === 'baja' ? almacenId : null,
        almacenDestinoId: tipoMovimiento === 'entrada' ? almacenId : null,
        estado: 'aprobado', // Ajustes del admin se aprueban automáticamente
        usuarioSolicitanteId: usuarioId,
        usuarioAprobadorId: usuarioId,
        fechaSolicitud: new Date(),
        fechaAprobacion: new Date(),
      })
      .returning();

    const movimientoId = nuevoMovimiento[0].id;

    // Crear detalles de movimiento
    for (const prod of productosAjuste) {
      await db.insert(movimientosDetalle).values({
        movimientoId,
        productoId: prod.productoId,
        cantidad: prod.cantidad,
        precioUnitario: null,
      });
    }

    // Actualizar inventario
    for (const prod of productosAjuste) {
      // Verificar si existe registro de inventario
      const existingInventario = await db
        .select()
        .from(inventario)
        .where(
          and(
            eq(inventario.almacenId, almacenId),
            eq(inventario.productoId, prod.productoId)
          )
        )
        .limit(1);

      const cantidadCambio = tipoMovimiento === 'entrada'
        ? prod.cantidad
        : -prod.cantidad;

      if (existingInventario.length > 0) {
        // Actualizar registro existente
        await db
          .update(inventario)
          .set({
            cantidad: sql`${inventario.cantidad} + ${cantidadCambio}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventario.almacenId, almacenId),
              eq(inventario.productoId, prod.productoId)
            )
          );
      } else {
        // Crear nuevo registro (solo para entradas)
        if (tipoMovimiento === 'entrada') {
          await db.insert(inventario).values({
            almacenId,
            productoId: prod.productoId,
            cantidad: prod.cantidad,
            updatedAt: new Date(),
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      movimiento: nuevoMovimiento[0],
      message: `Ajuste de inventario registrado exitosamente`,
    });
  } catch (error) {
    console.error('Error al crear ajuste:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para crear ajustes de inventario');
      }
    }

    return NextResponse.json(
      { error: 'Error al crear ajuste de inventario' },
      { status: 500 }
    );
  }
}
