import { NextResponse } from 'next/server';
import { db } from '@/db';
import { productos } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await db
      .select({
        id: productos.id,
        codigo: productos.codigo,
        nombre: productos.nombre,
        tipo: productos.tipo,
        descripcion: productos.descripcion,
        unidadMedida: productos.unidadMedida,
        precioBase: productos.precioBase,
        stockMinimo: productos.stockMinimo,
        activo: productos.activo,
      })
      .from(productos)
      .where(eq(productos.activo, 1))
      .orderBy(productos.nombre);

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}
