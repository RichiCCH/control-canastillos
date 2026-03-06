import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { productos, inventario, almacenes, movimientos } from '@/db/schema';
import { sql, eq, and, inArray, or } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const almacenId = request.nextUrl.searchParams.get('almacenId');
        // Para encargado: lista de almacenes separados por coma (ej: "1,3,5")
        const almacenesParam = request.nextUrl.searchParams.get('almacenes');

        if (almacenesParam) {
            // ── VISTA ENCARGADO: suma datos de múltiples almacenes ─────────────────
            const ids = almacenesParam.split(',').map(Number).filter(Boolean);

            const [recepcionesCount, productosCount, enviosCount, pendientesCount] = await Promise.all([
                db.select({ count: sql<number>`count(*)` })
                    .from(movimientos)
                    .where(and(inArray(movimientos.almacenDestinoId, ids), eq(movimientos.estado, 'pendiente'))),
                db.select({ count: sql<number>`count(distinct ${inventario.productoId})` })
                    .from(inventario)
                    .where(and(inArray(inventario.almacenId, ids), sql`${inventario.cantidad} > 0`)),
                db.select({ count: sql<number>`count(*)` })
                    .from(movimientos)
                    .where(and(inArray(movimientos.almacenOrigenId, ids), eq(movimientos.estado, 'pendiente'))),
                db.select({ count: sql<number>`count(*)` })
                    .from(movimientos)
                    .where(and(
                        or(inArray(movimientos.almacenOrigenId, ids), inArray(movimientos.almacenDestinoId, ids)),
                        eq(movimientos.estado, 'pendiente')
                    )),
            ]);

            return NextResponse.json({
                role: 'encargado',
                almacenesCount: ids.length,
                pendingReceptions: Number(recepcionesCount[0].count),
                productosEnStock: Number(productosCount[0].count),
                pendingSent: Number(enviosCount[0].count),
                movimientosPendientes: Number(pendientesCount[0].count),
            }, {
                headers: { 'Cache-Control': 'no-store' },
            });

        } else if (almacenId) {
            // ── VISTA OPERADOR: 3 queries en paralelo ──────────────────────────────
            const id = parseInt(almacenId);
            const [recepcionesCount, productosCount, enviosCount] = await Promise.all([
                db.select({ count: sql<number>`count(*)` })
                    .from(movimientos)
                    .where(and(eq(movimientos.almacenDestinoId, id), eq(movimientos.estado, 'pendiente'))),
                db.select({ count: sql<number>`count(distinct ${inventario.productoId})` })
                    .from(inventario)
                    .where(and(eq(inventario.almacenId, id), sql`${inventario.cantidad} > 0`)),
                db.select({ count: sql<number>`count(*)` })
                    .from(movimientos)
                    .where(and(eq(movimientos.almacenOrigenId, id), eq(movimientos.estado, 'pendiente'))),
            ]);

            return NextResponse.json({
                role: 'operator',
                pendingReceptions: Number(recepcionesCount[0].count),
                productosEnStock: Number(productosCount[0].count),
                pendingSent: Number(enviosCount[0].count),
            }, {
                headers: { 'Cache-Control': 'no-store' },
            });

        } else {
            // ── VISTA ADMIN: 4 queries en paralelo ─────────────────────────────────
            const [productosCount, inventarioSum, almacenesCount, pendientesCount] = await Promise.all([
                db.select({ count: sql<number>`count(*)` }).from(productos).where(eq(productos.activo, 1)),
                db.select({ sum: sql<number>`coalesce(sum(${inventario.cantidad}), 0)` }).from(inventario),
                db.select({ count: sql<number>`count(*)` }).from(almacenes),
                db.select({ count: sql<number>`count(*)` }).from(movimientos).where(eq(movimientos.estado, 'pendiente')),
            ]);

            return NextResponse.json({
                role: 'admin',
                totalProductos: Number(productosCount[0].count),
                totalInventario: Number(inventarioSum[0].sum),
                almacenes: Number(almacenesCount[0].count),
                movimientosPendientes: Number(pendientesCount[0].count),
            }, {
                headers: { 'Cache-Control': 'no-store' },
            });
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
    }
}
