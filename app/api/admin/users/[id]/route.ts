import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PATCH - Actualizar usuario
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin permission to edit users
    await requirePermission(request, 'admin.users.edit');

    const { id } = await params;
    const userId = parseInt(id);
    const body = await request.json();
    const { nombre, email, rol, almacenId, activo } = body;

    // Verificar que el usuario existe
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar email único si se está actualizando
    if (email && email !== existingUser[0].email) {
      const emailExists = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (emailExists.length > 0) {
        return NextResponse.json(
          { error: 'El email ya está registrado' },
          { status: 400 }
        );
      }
    }

    // Validar rol
    if (rol && !['admin', 'supervisor', 'operador'].includes(rol)) {
      return NextResponse.json(
        { error: 'Rol inválido' },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (nombre !== undefined) updateData.nombre = nombre;
    if (email !== undefined) updateData.email = email || null;
    if (rol !== undefined) updateData.rol = rol;
    if (almacenId !== undefined) updateData.almacenId = almacenId || null;

    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    return NextResponse.json({
      success: true,
      user: updatedUser[0],
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para editar usuarios');
      }
    }

    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

// DELETE - Desactivar usuario (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require admin permission to delete users
    await requirePermission(request, 'admin.users.delete');

    const { id } = await params;
    const userId = parseInt(id);

    // Verificar que el usuario existe
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Hard delete - eliminar usuario de la base de datos
    await db
      .delete(users)
      .where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
    });
  } catch (error) {
    console.error('Error al desactivar usuario:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para desactivar usuarios');
      }
    }

    return NextResponse.json(
      { error: 'Error al desactivar usuario' },
      { status: 500 }
    );
  }
}
