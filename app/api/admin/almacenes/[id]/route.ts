import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { almacenes, users } from '@/db/schema';
import { eq, and, ne, sql } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// PATCH - Actualizar almacén
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin permission to edit almacenes
    await requirePermission(request, 'admin.almacenes.edit');

    const { id } = await params;
    const almacenId = parseInt(id);

    if (isNaN(almacenId)) {
      return NextResponse.json(
        { error: 'ID de almacén inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { nombre, ubicacion, descripcion, activo } = body;

    // Verificar si el almacén existe
    const existingAlmacen = await db
      .select()
      .from(almacenes)
      .where(eq(almacenes.id, almacenId))
      .limit(1);

    if (existingAlmacen.length === 0) {
      return NextResponse.json(
        { error: 'Almacén no encontrado' },
        { status: 404 }
      );
    }

    // Si se está actualizando el nombre, verificar que no exista otro almacén con ese nombre
    if (nombre && nombre !== existingAlmacen[0].nombre) {
      const duplicateAlmacen = await db
        .select()
        .from(almacenes)
        .where(and(
          eq(almacenes.nombre, nombre),
          ne(almacenes.id, almacenId)
        ))
        .limit(1);

      if (duplicateAlmacen.length > 0) {
        return NextResponse.json(
          { error: 'Ya existe otro almacén con ese nombre' },
          { status: 400 }
        );
      }
    }

    // Si se está desactivando el almacén, verificar que no tenga usuarios activos asignados
    if (activo === 0 && existingAlmacen[0].activo === 1) {
      const activeUsersCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.almacenId, almacenId));

      const count = activeUsersCount[0]?.count || 0;

      if (count > 0) {
        return NextResponse.json(
          {
            error: `No se puede desactivar el almacén porque tiene ${count} usuario(s) asignado(s). Por favor, reasigna los usuarios primero.`,
            usuariosAsignados: count,
          },
          { status: 400 }
        );
      }
    }

    // Preparar datos para actualizar
    const updateData: any = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (ubicacion !== undefined) updateData.ubicacion = ubicacion || null;
    if (descripcion !== undefined) updateData.descripcion = descripcion || null;
    if (activo !== undefined) updateData.activo = activo;

    const updatedAlmacen = await db
      .update(almacenes)
      .set(updateData)
      .where(eq(almacenes.id, almacenId))
      .returning();

    return NextResponse.json({
      success: true,
      almacen: updatedAlmacen[0],
    });
  } catch (error) {
    console.error('Error al actualizar almacén:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para editar almacenes');
      }
    }

    return NextResponse.json(
      { error: 'Error al actualizar almacén' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete (desactivar almacén)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin permission to delete almacenes
    await requirePermission(request, 'admin.almacenes.delete');

    const { id } = await params;
    const almacenId = parseInt(id);

    if (isNaN(almacenId)) {
      return NextResponse.json(
        { error: 'ID de almacén inválido' },
        { status: 400 }
      );
    }

    // Verificar si el almacén existe
    const existingAlmacen = await db
      .select()
      .from(almacenes)
      .where(eq(almacenes.id, almacenId))
      .limit(1);

    if (existingAlmacen.length === 0) {
      return NextResponse.json(
        { error: 'Almacén no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que no tenga usuarios asignados
    const usersCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.almacenId, almacenId));

    const count = usersCount[0]?.count || 0;

    if (count > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar el almacén porque tiene ${count} usuario(s) asignado(s). Por favor, reasigna los usuarios primero.`,
          usuariosAsignados: count,
        },
        { status: 400 }
      );
    }

    // Soft delete: solo desactivar
    const deletedAlmacen = await db
      .update(almacenes)
      .set({ activo: 0 })
      .where(eq(almacenes.id, almacenId))
      .returning();

    return NextResponse.json({
      success: true,
      almacen: deletedAlmacen[0],
      message: 'Almacén desactivado exitosamente',
    });
  } catch (error) {
    console.error('Error al eliminar almacén:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para eliminar almacenes');
      }
    }

    return NextResponse.json(
      { error: 'Error al eliminar almacén' },
      { status: 500 }
    );
  }
}
