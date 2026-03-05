import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { movimientos, almacenes, users, movimientosDetalle, productos } from '@/db/schema';
import { eq, or, desc, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const almacenId = searchParams.get('almacenId');

    if (!almacenId) {
      return NextResponse.json({ error: 'almacenId es requerido' }, { status: 400 });
    }

    const almacenIdNum = parseInt(almacenId);

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
      .where(or(
        eq(movimientos.almacenOrigenId, almacenIdNum),
        eq(movimientos.almacenDestinoId, almacenIdNum),
      ))
      .orderBy(desc(movimientos.fechaSolicitud));

    if (movimientosData.length === 0) {
      return NextResponse.json([]);
    }

    // ─── 2. Recopilar IDs únicos para queries en batch ─────────────────────────
    const movIds = movimientosData.map(m => m.id);
    const almacenIds = [...new Set([
      ...movimientosData.map(m => m.almacenOrigenId).filter(Boolean),
      ...movimientosData.map(m => m.almacenDestinoId).filter(Boolean),
    ])] as number[];
    const userIds = [...new Set([
      ...movimientosData.map(m => m.usuarioSolicitanteId).filter(Boolean),
      ...movimientosData.map(m => m.usuarioAprobadorId).filter(Boolean),
    ])] as number[];

    // ─── 3. Queries en paralelo (3 queries total en vez de N*3) ───────────────
    const [almacenesData, usersData, detallesData] = await Promise.all([
      almacenIds.length > 0
        ? db.select({ id: almacenes.id, nombre: almacenes.nombre })
          .from(almacenes)
          .where(inArray(almacenes.id, almacenIds))
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
      else tipo = mov.almacenDestinoId === almacenIdNum ? 'entrada' : 'salida';

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
