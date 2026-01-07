import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { inventario, productos, almacenes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
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

    // Obtener todos los productos activos con su inventario en este almacén
    const productosActivos = await db
      .select({
        productoId: productos.id,
        productoCodigo: productos.codigo,
        productoNombre: productos.nombre,
        productoTipo: productos.tipo,
      })
      .from(productos)
      .where(eq(productos.activo, 1))
      .orderBy(productos.nombre);

    // Para cada producto, obtener su stock actual en el almacén
    const inventarioCompleto = await Promise.all(
      productosActivos.map(async (producto) => {
        const stockData = await db
          .select({
            cantidad: inventario.cantidad,
          })
          .from(inventario)
          .where(
            and(
              eq(inventario.productoId, producto.productoId),
              eq(inventario.almacenId, almacenIdNum)
            )
          )
          .limit(1);

        return {
          productoId: producto.productoId,
          codigo: producto.productoCodigo,
          nombre: producto.productoNombre,
          tipo: producto.productoTipo,
          stockActual: stockData[0]?.cantidad || 0,
        };
      })
    );

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
