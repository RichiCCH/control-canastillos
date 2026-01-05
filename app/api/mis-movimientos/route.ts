import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { movimientos, almacenes, users, movimientosDetalle, productos } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get('usuarioId');

    if (!usuarioId) {
      return NextResponse.json(
        { error: 'usuarioId es requerido' },
        { status: 400 }
      );
    }

    // Fetch all movements created by this user
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
        transportadoPor: movimientos.transportadoPor,
      })
      .from(movimientos)
      .where(eq(movimientos.usuarioSolicitanteId, parseInt(usuarioId)))
      .orderBy(movimientos.fechaSolicitud);

    // Fetch related data for each movement
    const result = await Promise.all(
      movimientosData.map(async (mov) => {
        // Fetch almacen destino
        const almacenDestino = await db
          .select({
            id: almacenes.id,
            nombre: almacenes.nombre,
          })
          .from(almacenes)
          .where(eq(almacenes.id, mov.almacenDestinoId))
          .limit(1);

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
          transportadoPor: mov.transportadoPor,
          fechaSolicitud: mov.fechaSolicitud,
          fechaAprobacion: mov.fechaAprobacion,
          almacenDestino: almacenDestino[0] || null,
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
    console.error('Error al obtener movimientos del usuario:', error);
    return NextResponse.json(
      { error: 'Error al obtener movimientos del usuario' },
      { status: 500 }
    );
  }
}
