import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { productos, inventario, almacenes, movimientos } from '@/db/schema';
import { sql, eq, and, lte } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const almacenId = searchParams.get('almacenId');

        if (almacenId) {
            // --- VISTA OPERADOR (Específica por Almacén) ---
            const id = parseInt(almacenId);

            // 1. Recepciones Pendientes (Destino = Mi Almacén, Estado = Pendiente)
            const [recepcionesCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(movimientos)
                .where(and(
                    eq(movimientos.almacenDestinoId, id),
                    eq(movimientos.estado, 'pendiente')
                ));

            // 2. Productos en Stock (Cantidad de productos distintos con stock > 0)
            const [productosCount] = await db
                .select({ count: sql<number>`count(distinct ${inventario.productoId})` })
                .from(inventario)
                .where(and(
                    eq(inventario.almacenId, id),
                    sql`${inventario.cantidad} > 0`
                ));

            // 3. Solicitudes Enviadas (Origen = Mi Almacén, Estado = Pendiente)
            const [enviosCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(movimientos)
                .where(and(
                    eq(movimientos.almacenOrigenId, id),
                    eq(movimientos.estado, 'pendiente')
                ));

            return NextResponse.json({
                role: 'operator',
                pendingReceptions: Number(recepcionesCount.count),
                productosEnStock: Number(productosCount.count),
                pendingSent: Number(enviosCount.count)
            });

        } else {
            // --- VISTA ADMIN (Global) ---
            // 1. Total Productos Activos
            const [productosCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(productos)
                .where(eq(productos.activo, 1));

            // 2. Total Unidades (Suma global)
            const [inventarioSum] = await db
                .select({ sum: sql<number>`coalesce(sum(${inventario.cantidad}), 0)` })
                .from(inventario);

            // 3. Total Almacenes
            const [almacenesCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(almacenes);

            // 4. Movimientos Pendientes Totales
            const [pendientesCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(movimientos)
                .where(eq(movimientos.estado, 'pendiente'));

            return NextResponse.json({
                role: 'admin',
                totalProductos: Number(productosCount.count),
                totalInventario: Number(inventarioSum.sum),
                almacenes: Number(almacenesCount.count),
                movimientosPendientes: Number(pendientesCount.count),
            });
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json(
            { error: 'Error al obtener estadísticas' },
            { status: 500 }
        );
    }
}
