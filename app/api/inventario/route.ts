import { NextResponse } from 'next/server';
import { db } from '@/db';
import { inventario, productos, almacenes } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const almacenId = searchParams.get('almacenId');

    if (almacenId) {
      // Obtener inventario de un almacén específico
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
        .where(eq(inventario.almacenId, parseInt(almacenId)));

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
