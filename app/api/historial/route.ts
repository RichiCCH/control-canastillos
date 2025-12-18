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
    const movimientosData = await db
      .select({
        id: movimientos.id,
        almacenOrigenId: movimientos.almacenOrigenId,
        almacenDestinoId: movimientos.almacenDestinoId,
        usuarioSolicitanteId: movimientos.usuarioSolicitanteId,
        usuarioAprobadorId: movimientos.usuarioAprobadorId,
        fechaSolicitud: movimientos.fechaSolicitud,
        fechaAprobacion: movimientos.fechaAprobacion,
        estado: movimientos.estado,
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
        // Determinar si es entrada o salida para este almacén
        const tipo = mov.almacenDestinoId === almacenIdNum ? 'entrada' : 'salida';

        // Fetch almacen origen
        const almacenOrigen = await db
          .select({
            id: almacenes.id,
            nombre: almacenes.nombre,
          })
          .from(almacenes)
          .where(eq(almacenes.id, mov.almacenOrigenId))
          .limit(1);

        // Fetch almacen destino
        const almacenDestino = await db
          .select({
            id: almacenes.id,
            nombre: almacenes.nombre,
          })
          .from(almacenes)
          .where(eq(almacenes.id, mov.almacenDestinoId))
          .limit(1);

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
          estado: mov.estado,
          observaciones: mov.observaciones,
          fechaSolicitud: mov.fechaSolicitud,
          fechaAprobacion: mov.fechaAprobacion,
          tipo,
          almacenOrigen: almacenOrigen[0] || null,
          almacenDestino: almacenDestino[0] || null,
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
