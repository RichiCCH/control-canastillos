import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { movimientos, almacenes, users, movimientosDetalle, productos } from '@/db/schema';
import { eq, or, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const almacenId = searchParams.get('almacenId');

    if (!almacenId) {
      return NextResponse.json(
        { error: 'almacenId es requerido' },
        { status: 400 }
      );
    }

    const almacenIdNum = parseInt(almacenId);

    // Fetch all movements where this warehouse is either origin or destination
    // Incluye movimientos tipo 'salida', 'entrada' (ajustes), y 'baja' (ajustes)
    const movimientosData = await db
      .select({
        id: movimientos.id,
        tipoMovimiento: movimientos.tipoMovimiento,
        almacenOrigenId: movimientos.almacenOrigenId,
        almacenDestinoId: movimientos.almacenDestinoId,
        usuarioSolicitanteId: movimientos.usuarioSolicitanteId,
        usuarioAprobadorId: movimientos.usuarioAprobadorId,
        fechaSolicitud: movimientos.fechaSolicitud,
        fechaAprobacion: movimientos.fechaAprobacion,
        estado: movimientos.estado,
        motivo: movimientos.motivo,
        proveedorResponsable: movimientos.proveedorResponsable,
        observaciones: movimientos.observaciones,
      })
      .from(movimientos)
      .where(
        or(
          eq(movimientos.almacenOrigenId, almacenIdNum),
          eq(movimientos.almacenDestinoId, almacenIdNum)
        )
      )
      .orderBy(desc(movimientos.fechaSolicitud)); // Ordenar de más nuevo a más antiguo

    // Fetch related data for each movement
    const result = await Promise.all(
      movimientosData.map(async (mov) => {
        // Determinar el tipo de movimiento
        let tipo: string;

        if (mov.tipoMovimiento === 'entrada') {
          tipo = 'ajuste_entrada'; // Ajuste de entrada (compra, devolución)
        } else if (mov.tipoMovimiento === 'baja') {
          tipo = 'ajuste_baja'; // Ajuste de baja (daño, pérdida)
        } else {
          // Movimiento normal tipo 'salida'
          tipo = mov.almacenDestinoId === almacenIdNum ? 'entrada' : 'salida';
        }

        // Fetch almacen origen (si existe)
        let almacenOrigen = null;
        if (mov.almacenOrigenId) {
          const almacenOrigenData = await db
            .select({
              id: almacenes.id,
              nombre: almacenes.nombre,
            })
            .from(almacenes)
            .where(eq(almacenes.id, mov.almacenOrigenId))
            .limit(1);
          almacenOrigen = almacenOrigenData[0] || null;
        }

        // Fetch almacen destino (si existe)
        let almacenDestino = null;
        if (mov.almacenDestinoId) {
          const almacenDestinoData = await db
            .select({
              id: almacenes.id,
              nombre: almacenes.nombre,
            })
            .from(almacenes)
            .where(eq(almacenes.id, mov.almacenDestinoId))
            .limit(1);
          almacenDestino = almacenDestinoData[0] || null;
        }

        // Fetch usuario solicitante
        let usuarioSolicitante = null;
        if (mov.usuarioSolicitanteId) {
          const solicitante = await db
            .select({
              id: users.id,
              nombre: users.nombre,
            })
            .from(users)
            .where(eq(users.id, mov.usuarioSolicitanteId))
            .limit(1);
          usuarioSolicitante = solicitante[0] || null;
        }

        // Fetch usuario aprobador if exists
        let usuarioAprobador = null;
        if (mov.usuarioAprobadorId) {
          const aprobador = await db
            .select({
              id: users.id,
              nombre: users.nombre,
            })
            .from(users)
            .where(eq(users.id, mov.usuarioAprobadorId))
            .limit(1);
          usuarioAprobador = aprobador[0] || null;
        }

        // Fetch movement details with products
        const detalles = await db
          .select({
            id: movimientosDetalle.id,
            cantidad: movimientosDetalle.cantidad,
            productoId: movimientosDetalle.productoId,
            productoCodigo: productos.codigo,
            productoNombre: productos.nombre,
            productoTipo: productos.tipo,
            productoUnidadMedida: productos.unidadMedida,
          })
          .from(movimientosDetalle)
          .innerJoin(productos, eq(movimientosDetalle.productoId, productos.id))
          .where(eq(movimientosDetalle.movimientoId, mov.id));

        return {
          id: mov.id,
          tipoMovimiento: mov.tipoMovimiento,
          estado: mov.estado,
          motivo: mov.motivo,
          proveedorResponsable: mov.proveedorResponsable,
          observaciones: mov.observaciones,
          fechaSolicitud: mov.fechaSolicitud,
          fechaAprobacion: mov.fechaAprobacion,
          tipo,
          almacenOrigen,
          almacenDestino,
          usuarioSolicitante,
          usuarioAprobador,
          detalles: detalles.map((d) => ({
            id: d.id,
            cantidad: d.cantidad,
            producto: {
              id: d.productoId,
              codigo: d.productoCodigo,
              nombre: d.productoNombre,
              tipo: d.productoTipo,
              unidadMedida: d.productoUnidadMedida,
            },
          })),
        };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return NextResponse.json(
      { error: 'Error al obtener historial' },
      { status: 500 }
    );
  }
}
