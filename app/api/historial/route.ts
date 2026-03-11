import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { movimientos, almacenes, users, movimientosDetalle, productos } from '@/db/schema';
import { eq, or, desc, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const almacenId = searchParams.get('almacenId');
    const almacenesParam = searchParams.get('almacenes'); // "1,3,5" para encargado multi

    const todos = searchParams.get('todos') === 'true'; // admin: sin filtro

    // Construir lista de almacenes a filtrar
    let almacenIds: number[] = [];
    if (!todos) {
      if (almacenesParam) {
        almacenIds = almacenesParam.split(',').map(Number).filter(Boolean);
      } else if (almacenId) {
        almacenIds = [parseInt(almacenId)];
      }

      if (almacenIds.length === 0) {
        return NextResponse.json({ error: 'almacenId o almacenes es requerido' }, { status: 400 });
      }
    }

    // ─── 1. Un solo query para todos los movimientos ───────────────────────────
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
        transportadoPor: movimientos.transportadoPor,
      })
      .from(movimientos)
      .where(todos ? undefined : or(
        inArray(movimientos.almacenOrigenId, almacenIds),
        inArray(movimientos.almacenDestinoId, almacenIds),
      ))
      .orderBy(desc(movimientos.fechaSolicitud));

    // Set de almacenIds para calcular tipo por movimiento (vacío si admin ve todo)
    const almacenIdsSet = new Set(almacenIds);


    if (movimientosData.length === 0) {
      return NextResponse.json([]);
    }

    // ─── 2. Recopilar IDs únicos de almacenes involucrados para lookup ─────────
    const movIds = movimientosData.map(m => m.id);
    const almIdsBatch = [...new Set([
      ...movimientosData.map(m => m.almacenOrigenId).filter(Boolean),
      ...movimientosData.map(m => m.almacenDestinoId).filter(Boolean),
    ])] as number[];
    const userIds = [...new Set([
      ...movimientosData.map(m => m.usuarioSolicitanteId).filter(Boolean),
      ...movimientosData.map(m => m.usuarioAprobadorId).filter(Boolean),
    ])] as number[];

    // ─── 3. Queries en paralelo (3 queries total en vez de N*3) ───────────────
    const [almacenesData, usersData, detallesData] = await Promise.all([
      almIdsBatch.length > 0
        ? db.select({ id: almacenes.id, nombre: almacenes.nombre })
          .from(almacenes)
          .where(inArray(almacenes.id, almIdsBatch))
        : Promise.resolve([]),
      userIds.length > 0
        ? db.select({ id: users.id, nombre: users.nombre })
          .from(users)
          .where(inArray(users.id, userIds))
        : Promise.resolve([]),
      db.select({
        movimientoId: movimientosDetalle.movimientoId,
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
        .where(inArray(movimientosDetalle.movimientoId, movIds)),
    ]);

    // ─── 4. Construir mapas de lookup O(1) ────────────────────────────────────
    const almMap = new Map(almacenesData.map(a => [a.id, a]));
    const userMap = new Map(usersData.map(u => [u.id, u]));
    const detallesMap = new Map<number, typeof detallesData>();
    for (const d of detallesData) {
      const arr = detallesMap.get(d.movimientoId) ?? [];
      arr.push(d);
      detallesMap.set(d.movimientoId, arr);
    }

    // ─── 5. Ensamblar resultado final ─────────────────────────────────────────
    const result = movimientosData.map(mov => {
      let tipo: string;
      if (mov.tipoMovimiento === 'entrada') tipo = 'ajuste_entrada';
      else if (mov.tipoMovimiento === 'baja') tipo = 'ajuste_baja';
      // Para admin (sin filtro): mostrar siempre como transferencia; para otros: perspectiva del almacén
      else if (todos) tipo = 'salida'; // desde perspectiva del origen
      else tipo = (mov.almacenDestinoId && almacenIdsSet.has(mov.almacenDestinoId)) ? 'entrada' : 'salida';

      const detalles = (detallesMap.get(mov.id) ?? []).map(d => ({
        id: d.id,
        cantidad: d.cantidad,
        producto: {
          id: d.productoId,
          codigo: d.productoCodigo,
          nombre: d.productoNombre,
          tipo: d.productoTipo,
          unidadMedida: d.productoUnidadMedida,
        },
      }));

      return {
        id: mov.id,
        tipoMovimiento: mov.tipoMovimiento,
        estado: mov.estado,
        motivo: mov.motivo,
        proveedorResponsable: mov.proveedorResponsable,
        observaciones: mov.observaciones,
        transportadoPor: mov.transportadoPor,
        fechaSolicitud: mov.fechaSolicitud,
        fechaAprobacion: mov.fechaAprobacion,
        tipo,
        almacenOrigen: mov.almacenOrigenId ? (almMap.get(mov.almacenOrigenId) ?? null) : null,
        almacenDestino: mov.almacenDestinoId ? (almMap.get(mov.almacenDestinoId) ?? null) : null,
        usuarioSolicitante: mov.usuarioSolicitanteId ? (userMap.get(mov.usuarioSolicitanteId) ?? null) : null,
        usuarioAprobador: mov.usuarioAprobadorId ? (userMap.get(mov.usuarioAprobadorId) ?? null) : null,
        detalles,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
  }
}
