import { NextResponse } from 'next/server';
import { db } from '@/db';
import { movimientos, movimientosDetalle, inventario, productos, almacenes, users } from '@/db/schema';
import { eq, and, sql, inArray, or } from 'drizzle-orm';
import { crearNotificacionNuevoMovimiento } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

// GET - Obtener movimientos pendientes para un almacén
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const almacenDestinoId = searchParams.get('almacenDestinoId');
    const almacenesParam = searchParams.get('almacenesDestinoIds'); // "1,2,3" para encargado multi

    // Construir lista de IDs destino
    let destIds: number[] = [];
    if (almacenesParam) {
      destIds = almacenesParam.split(',').map(Number).filter(Boolean);
    } else if (almacenDestinoId) {
      destIds = [parseInt(almacenDestinoId)];
    }

    if (destIds.length === 0) {
      return NextResponse.json(
        { error: 'almacenDestinoId es requerido' },
        { status: 400 }
      );
    }

    const destinoWhere = destIds.length === 1
      ? eq(movimientos.almacenDestinoId, destIds[0])
      : inArray(movimientos.almacenDestinoId, destIds);

    // Una sola query con JOIN para traer movimientos + detalles en paralelo
    const [rows, detallesRows] = await Promise.all([
      db.select({
          id: movimientos.id,
          estado: movimientos.estado,
          observaciones: movimientos.observaciones,
          fechaSolicitud: movimientos.fechaSolicitud,
          almacenOrigenId: almacenes.id,
          almacenOrigenNombre: almacenes.nombre,
          usuarioSolicitanteId: users.id,
          usuarioSolicitanteNombre: users.nombre,
        })
        .from(movimientos)
        .where(and(destinoWhere, eq(movimientos.estado, 'pendiente')))
        .leftJoin(almacenes, eq(movimientos.almacenOrigenId, almacenes.id))
        .leftJoin(users, eq(movimientos.usuarioSolicitanteId, users.id)),

      // Todos los detalles de movimientos pendientes en una sola query
      db.select({
          movimientoId: movimientosDetalle.movimientoId,
          id: movimientosDetalle.id,
          cantidad: movimientosDetalle.cantidad,
          productoId: productos.id,
          productoCodigo: productos.codigo,
          productoNombre: productos.nombre,
          productoTipo: productos.tipo,
        })
        .from(movimientosDetalle)
        .innerJoin(movimientos, eq(movimientosDetalle.movimientoId, movimientos.id))
        .innerJoin(productos, eq(movimientosDetalle.productoId, productos.id))
        .where(and(destinoWhere, eq(movimientos.estado, 'pendiente'))),
    ]);

    // Agrupar detalles por movimientoId
    const detallesPorMov = new Map<number, typeof detallesRows>();
    for (const d of detallesRows) {
      if (!detallesPorMov.has(d.movimientoId!)) detallesPorMov.set(d.movimientoId!, []);
      detallesPorMov.get(d.movimientoId!)!.push(d);
    }

    const result = rows.map(mov => ({
      id: mov.id,
      estado: mov.estado,
      observaciones: mov.observaciones,
      fechaSolicitud: mov.fechaSolicitud,
      almacenOrigen: { id: mov.almacenOrigenId!, nombre: mov.almacenOrigenNombre! },
      usuarioSolicitante: { id: mov.usuarioSolicitanteId!, nombre: mov.usuarioSolicitanteNombre! },
      detalles: (detallesPorMov.get(mov.id) || []).map(d => ({
        id: d.id,
        cantidad: d.cantidad,
        producto: { id: d.productoId!, codigo: d.productoCodigo!, nombre: d.productoNombre!, tipo: d.productoTipo! },
      })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    return NextResponse.json(
      { error: 'Error al obtener movimientos' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva solicitud de movimiento con múltiples productos
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { almacenDestinoId, usuarioSolicitanteId, observaciones, detalles, almacenOrigenId: bodyAlmacenOrigenId } = body;

    if (!almacenDestinoId || !usuarioSolicitanteId || !detalles || detalles.length === 0) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: almacenDestinoId, usuarioSolicitanteId, y detalles' },
        { status: 400 }
      );
    }

    // Obtener el usuario para saber su almacén de origen
    const usuario = await db
      .select()
      .from(users)
      .where(eq(users.id, usuarioSolicitanteId))
      .limit(1);

    if (usuario.length === 0 || !usuario[0].almacenId) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o sin almacén asignado' },
        { status: 400 }
      );
    }

    // Si el front-end mandó un origen, usarlo (útil para encargados multialmacén), si no usar el default.
    const almacenOrigenId = bodyAlmacenOrigenId ? parseInt(bodyAlmacenOrigenId) : usuario[0].almacenId;

    // Verificar que el almacén de origen tenga suficiente inventario
    for (const detalle of detalles) {
      const inventarioItem = await db
        .select()
        .from(inventario)
        .where(
          and(
            eq(inventario.productoId, detalle.productoId),
            eq(inventario.almacenId, almacenOrigenId)
          )
        )
        .limit(1);

      if (inventarioItem.length === 0 || inventarioItem[0].cantidad < detalle.cantidad) {
        const producto = await db
          .select()
          .from(productos)
          .where(eq(productos.id, detalle.productoId))
          .limit(1);

        return NextResponse.json(
          {
            error: `No hay suficiente inventario de ${producto[0]?.nombre || 'producto'}. Disponible: ${inventarioItem[0]?.cantidad || 0}, Solicitado: ${detalle.cantidad}`
          },
          { status: 400 }
        );
      }
    }

    // Crear el movimiento (header)
    const nuevoMovimiento = await db
      .insert(movimientos)
      .values({
        almacenOrigenId,
        almacenDestinoId,
        usuarioSolicitanteId,
        observaciones: observaciones || null,
        estado: 'pendiente',
      })
      .returning();

    const movimientoId = nuevoMovimiento[0].id;

    // Crear los detalles del movimiento y actualizar inventario
    for (const detalle of detalles) {
      // Insertar detalle
      await db
        .insert(movimientosDetalle)
        .values({
          movimientoId,
          productoId: detalle.productoId,
          cantidad: detalle.cantidad,
        });

      // Reducir inventario en almacén de origen
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
        await db
          .update(inventario)
          .set({
            cantidad: inventarioActual[0].cantidad - detalle.cantidad,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(inventario.productoId, detalle.productoId),
              eq(inventario.almacenId, almacenOrigenId)
            )
          );
      }
    }

    // Crear notificación para los usuarios del almacén destino
    const almacenOrigen = await db
      .select()
      .from(almacenes)
      .where(eq(almacenes.id, almacenOrigenId))
      .limit(1);

    await crearNotificacionNuevoMovimiento(
      movimientoId,
      almacenDestinoId,
      almacenOrigen[0]?.nombre || 'Almacén desconocido',
      usuario[0].nombre
    );

    return NextResponse.json(
      {
        success: true,
        movimiento: nuevoMovimiento[0],
        detallesCreados: detalles.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear movimiento:', error);
    return NextResponse.json(
      { error: 'Error al crear movimiento' },
      { status: 500 }
    );
  }
}
