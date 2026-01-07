import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { productos, inventario } from '@/db/schema';
import { eq, and, ne, sql } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// PATCH - Actualizar producto
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin permission to edit productos
    await requirePermission(request, 'admin.productos.edit');

    const { id } = await params;
    const productoId = parseInt(id);

    if (isNaN(productoId)) {
      return NextResponse.json(
        { error: 'ID de producto inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { codigo, nombre, tipo, descripcion, unidadMedida, precioBase, stockMinimo, activo } = body;

    // Verificar si el producto existe
    const existingProducto = await db
      .select()
      .from(productos)
      .where(eq(productos.id, productoId))
      .limit(1);

    if (existingProducto.length === 0) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Si se está actualizando el código, verificar que no exista otro producto con ese código
    if (codigo && codigo !== existingProducto[0].codigo) {
      const duplicateProducto = await db
        .select()
        .from(productos)
        .where(and(
          eq(productos.codigo, codigo),
          ne(productos.id, productoId)
        ))
        .limit(1);

      if (duplicateProducto.length > 0) {
        return NextResponse.json(
          { error: 'Ya existe otro producto con ese código' },
          { status: 400 }
        );
      }
    }

    // Si se está desactivando el producto, verificar que no tenga stock en ningún almacén
    if (activo === 0 && existingProducto[0].activo === 1) {
      const inventarioCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(inventario)
        .where(and(
          eq(inventario.productoId, productoId),
          sql`${inventario.cantidad} > 0`
        ));

      const count = inventarioCount[0]?.count || 0;

      if (count > 0) {
        return NextResponse.json(
          {
            error: `No se puede desactivar el producto porque tiene stock en ${count} almacén(es). Vacía el inventario primero.`,
            almacenesConStock: count,
          },
          { status: 400 }
        );
      }
    }

    // Preparar datos para actualizar
    const updateData: any = {};
    if (codigo !== undefined) updateData.codigo = codigo;
    if (nombre !== undefined) updateData.nombre = nombre;
    if (tipo !== undefined) updateData.tipo = tipo;
    if (descripcion !== undefined) updateData.descripcion = descripcion || null;
    if (unidadMedida !== undefined) updateData.unidadMedida = unidadMedida;
    if (precioBase !== undefined) updateData.precioBase = precioBase || null;
    if (stockMinimo !== undefined) updateData.stockMinimo = stockMinimo;
    if (activo !== undefined) updateData.activo = activo;

    const updatedProducto = await db
      .update(productos)
      .set(updateData)
      .where(eq(productos.id, productoId))
      .returning();

    return NextResponse.json({
      success: true,
      producto: updatedProducto[0],
    });
  } catch (error) {
    console.error('Error al actualizar producto:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para editar productos');
      }
    }

    return NextResponse.json(
      { error: 'Error al actualizar producto' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete (desactivar producto)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin permission to delete productos
    await requirePermission(request, 'admin.productos.delete');

    const { id } = await params;
    const productoId = parseInt(id);

    if (isNaN(productoId)) {
      return NextResponse.json(
        { error: 'ID de producto inválido' },
        { status: 400 }
      );
    }

    // Verificar si el producto existe
    const existingProducto = await db
      .select()
      .from(productos)
      .where(eq(productos.id, productoId))
      .limit(1);

    if (existingProducto.length === 0) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que no tenga stock en ningún almacén
    const inventarioCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventario)
      .where(and(
        eq(inventario.productoId, productoId),
        sql`${inventario.cantidad} > 0`
      ));

    const count = inventarioCount[0]?.count || 0;

    if (count > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar el producto porque tiene stock en ${count} almacén(es). Vacía el inventario primero.`,
          almacenesConStock: count,
        },
        { status: 400 }
      );
    }

    // Soft delete: solo desactivar
    const deletedProducto = await db
      .update(productos)
      .set({ activo: 0 })
      .where(eq(productos.id, productoId))
      .returning();

    return NextResponse.json({
      success: true,
      producto: deletedProducto[0],
      message: 'Producto desactivado exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar producto:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para eliminar productos');
      }
    }

    return NextResponse.json(
      { error: 'Error al eliminar producto' },
      { status: 500 }
    );
  }
}
