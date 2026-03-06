import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { inventario, productos, almacenes } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Obtener inventario completo de un almacén para reconteo
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'admin.ajustes.view');

    const { searchParams } = new URL(request.url);
    const almacenId = searchParams.get('almacenId');

    if (!almacenId) {
      return NextResponse.json(
        { error: 'almacenId es requerido' },
        { status: 400 }
      );
    }

    const almacenIdNum = parseInt(almacenId);

    // Single LEFT JOIN query: all active products with their stock in this almacén
    const inventarioCompleto = await db
      .select({
        productoId: productos.id,
        codigo: productos.codigo,
        nombre: productos.nombre,
        tipo: productos.tipo,
        stockActual: sql<number>`coalesce(${inventario.cantidad}, 0)`,
      })
      .from(productos)
      .leftJoin(
        inventario,
        and(
          eq(inventario.productoId, productos.id),
          eq(inventario.almacenId, almacenIdNum)
        )
      )
      .where(eq(productos.activo, 1))
      .orderBy(productos.nombre);

    return NextResponse.json(inventarioCompleto);
  } catch (error) {
    console.error('Error al obtener inventario:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para ver el inventario');
      }
    }

    return NextResponse.json(
      { error: 'Error al obtener inventario' },
      { status: 500 }
    );
  }
}
