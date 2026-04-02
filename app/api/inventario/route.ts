import { NextResponse } from 'next/server';
import { db } from '@/db';
import { inventario, productos, almacenes } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const almacenId = searchParams.get('almacenId');
    const productoId = searchParams.get('productoId');

    if (almacenId) {
      // Obtener inventario de un almacén específico, opcionalmente filtrado por producto
      const conditions = [eq(inventario.almacenId, parseInt(almacenId))];
      if (productoId) conditions.push(eq(inventario.productoId, parseInt(productoId)));

      const items = await db
        .select({
          id: inventario.id,
          cantidad: inventario.cantidad,
          producto: {
            id: productos.id,
            codigo: productos.codigo,
            nombre: productos.nombre,
            tipo: productos.tipo,
            unidadMedida: productos.unidadMedida,
          },
        })
        .from(inventario)
        .innerJoin(productos, eq(inventario.productoId, productos.id))
        .where(and(...conditions));

      return NextResponse.json(items);
    }

    // Obtener todo el inventario con información de almacenes
    const items = await db
      .select({
        id: inventario.id,
        cantidad: inventario.cantidad,
        producto: {
          id: productos.id,
          codigo: productos.codigo,
          nombre: productos.nombre,
          tipo: productos.tipo,
        },
        almacen: {
          id: almacenes.id,
          nombre: almacenes.nombre,
        },
      })
      .from(inventario)
      .innerJoin(productos, eq(inventario.productoId, productos.id))
      .innerJoin(almacenes, eq(inventario.almacenId, almacenes.id));

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    return NextResponse.json(
      { error: 'Error al obtener inventario' },
      { status: 500 }
    );
  }
}
