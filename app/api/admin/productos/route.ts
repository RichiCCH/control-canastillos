import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { productos } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Obtener todos los productos (incluyendo inactivos)
export async function GET(request: NextRequest) {
  try {
    // Require admin permission to view productos
    await requirePermission(request, 'admin.productos.view');

    const allProductos = await db
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
        createdAt: productos.createdAt,
      })
      .from(productos);

    return NextResponse.json(allProductos);
  } catch (error) {
    console.error('Error al obtener productos:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para ver productos');
      }
    }

    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo producto
export async function POST(request: NextRequest) {
  try {
    // Require admin permission to create productos
    await requirePermission(request, 'admin.productos.create');

    const body = await request.json();
    const { codigo, nombre, tipo, descripcion, unidadMedida, precioBase, stockMinimo } = body;

    if (!codigo || !nombre || !tipo) {
      return NextResponse.json(
        { error: 'Código, nombre y tipo son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si el código ya existe
    const existingProducto = await db
      .select()
      .from(productos)
      .where(eq(productos.codigo, codigo))
      .limit(1);

    if (existingProducto.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un producto con ese código' },
        { status: 400 }
      );
    }

    const newProducto = await db
      .insert(productos)
      .values({
        codigo,
        nombre,
        tipo,
        descripcion: descripcion || null,
        unidadMedida: unidadMedida || 'unidad',
        precioBase: precioBase || null,
        stockMinimo: stockMinimo || 0,
        activo: 1, // Por defecto activo
      })
      .returning();

    return NextResponse.json({
      success: true,
      producto: newProducto[0],
    });
  } catch (error) {
    console.error('Error al crear producto:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para crear productos');
      }
    }

    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    );
  }
}
