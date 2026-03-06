import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { movimientos, movimientosDetalle, inventario, productos, almacenes } from '@/db/schema';
import { eq, desc, sql, and, or, inArray } from 'drizzle-orm';
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

    if (ajustes.length === 0) return NextResponse.json([]);

    const ajusteIds = ajustes.map(a => a.id);

    // Batch fetch: all detalles + all almacenes in parallel
    const [detallesRows, allAlmacenes] = await Promise.all([
      db.select({
          movimientoId: movimientosDetalle.movimientoId,
          id: movimientosDetalle.id,
          productoId: movimientosDetalle.productoId,
          cantidad: movimientosDetalle.cantidad,
          nombreProducto: productos.nombre,
          codigoProducto: productos.codigo,
          tipoProducto: productos.tipo,
        })
        .from(movimientosDetalle)
        .innerJoin(productos, eq(movimientosDetalle.productoId, productos.id))
        .where(inArray(movimientosDetalle.movimientoId, ajusteIds)),
      db.select({ id: almacenes.id, nombre: almacenes.nombre }).from(almacenes),
    ]);

    // Build lookup maps
    const detallesPorAjuste = new Map<number, typeof detallesRows>();
    for (const d of detallesRows) {
      if (!detallesPorAjuste.has(d.movimientoId!)) detallesPorAjuste.set(d.movimientoId!, []);
      detallesPorAjuste.get(d.movimientoId!)!.push(d);
    }
    const almacenMap = new Map(allAlmacenes.map(a => [a.id, a.nombre]));

    const ajustesConDetalles = ajustes.map(ajuste => {
      const almacenId = ajuste.tipoMovimiento === 'entrada'
        ? ajuste.almacenDestinoId
        : ajuste.almacenOrigenId;
      return {
        ...ajuste,
        almacenId,
        almacenNombre: almacenId ? (almacenMap.get(almacenId) || null) : null,
        detalles: detallesPorAjuste.get(ajuste.id) || [],
      };
    });

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

    // Validar cantidades
    for (const prod of productosAjuste) {
      if (!prod.productoId || !prod.cantidad || prod.cantidad <= 0) {
        return NextResponse.json(
          { error: 'Todos los productos deben tener cantidad válida' },
          { status: 400 }
        );
      }
    }

    const productoIds: number[] = productosAjuste.map((p: { productoId: number }) => p.productoId);

    // Batch fetch inventory for all products at once
    const inventarioActual = await db
      .select({ productoId: inventario.productoId, cantidad: inventario.cantidad })
      .from(inventario)
      .where(and(eq(inventario.almacenId, almacenId), inArray(inventario.productoId, productoIds)));
    const stockMap = new Map(inventarioActual.map(i => [i.productoId, i.cantidad]));

    // Validate stock for bajas
    if (tipoMovimiento === 'baja') {
      // Batch fetch product names for error messages
      const productosData = await db
        .select({ id: productos.id, nombre: productos.nombre })
        .from(productos)
        .where(inArray(productos.id, productoIds));
      const productoNombreMap = new Map(productosData.map(p => [p.id, p.nombre]));

      for (const prod of productosAjuste) {
        const cantidadDisponible = stockMap.get(prod.productoId) || 0;
        if (cantidadDisponible < prod.cantidad) {
          return NextResponse.json(
            { error: `Stock insuficiente de ${productoNombreMap.get(prod.productoId) || 'producto'}. Disponible: ${cantidadDisponible}, Solicitado: ${prod.cantidad}` },
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

    // Batch insert detalles
    await db.insert(movimientosDetalle).values(
      productosAjuste.map((prod: { productoId: number; cantidad: number }) => ({
        movimientoId,
        productoId: prod.productoId,
        cantidad: prod.cantidad,
        precioUnitario: null,
      }))
    );

    // Parallel inventory updates (stockMap already fetched above)
    const now = new Date();
    await Promise.all(
      productosAjuste.map(async (prod: { productoId: number; cantidad: number }) => {
        const cantidadCambio = tipoMovimiento === 'entrada' ? prod.cantidad : -prod.cantidad;
        const existeStock = stockMap.has(prod.productoId);
        if (existeStock) {
          await db
            .update(inventario)
            .set({ cantidad: sql`${inventario.cantidad} + ${cantidadCambio}`, updatedAt: now })
            .where(and(eq(inventario.almacenId, almacenId), eq(inventario.productoId, prod.productoId)));
        } else if (tipoMovimiento === 'entrada') {
          await db.insert(inventario).values({ almacenId, productoId: prod.productoId, cantidad: prod.cantidad, updatedAt: now });
        }
      })
    );

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
