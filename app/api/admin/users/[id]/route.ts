import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, usuariosAlmacenes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ROLES_VALIDOS = ['admin', 'encargado', 'supervisor', 'operador'];

// PATCH - Actualizar usuario
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(request, 'admin.users.edit');

    const { id } = await params;
    const userId = parseInt(id);
    const body = await request.json();
    const { nombre, email, password, rol, almacenId, almacenesIds, activo } = body;
    // Verificar que el usuario existe
    const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Validar email único si cambia
    if (email && email !== existing[0].email) {
      const emailExists = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (emailExists.length > 0) {
        return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
      }
    }

    // Validar rol
    if (rol && !ROLES_VALIDOS.includes(rol)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    const rolFinal = rol ?? existing[0].rol;

    // Para encargado con almacenesIds, validar que haya al menos uno
    if (rolFinal === 'encargado' && Array.isArray(almacenesIds) && almacenesIds.length === 0) {
      return NextResponse.json(
        { error: 'Un encargado debe tener al menos un almacén asignado' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (email !== undefined) updateData.email = email || null;
    if (rol !== undefined) updateData.rol = rol;
    if (activo !== undefined) updateData.activo = activo;

    // Almacén principal
    if (rolFinal === 'encargado' && Array.isArray(almacenesIds) && almacenesIds.length > 0) {
      updateData.almacenId = almacenesIds[0];
    } else if (almacenId !== undefined) {
      updateData.almacenId = almacenId || null;
    }

    if (password?.trim()) {
      updateData.password = password.trim();
    }

    // Actualizar usuario principal
    const [updatedUser] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning();

    // Actualizar tabla pivote
    if (rolFinal === 'encargado' && Array.isArray(almacenesIds)) {
      // Siempre reemplazar la pivote para encargados
      await db.delete(usuariosAlmacenes).where(eq(usuariosAlmacenes.usuarioId, userId));
      if (almacenesIds.length > 0) {
        await db.insert(usuariosAlmacenes).values(
          almacenesIds.map((aid: number, idx: number) => ({
            usuarioId: userId,
            almacenId: aid,
            esPrincipal: idx === 0 ? 1 : 0,
          }))
        );
      }
    } else if (almacenId !== undefined && rolFinal !== 'encargado') {
      // Para roles simples: sincronizar la pivote con su almacén único
      await db.delete(usuariosAlmacenes).where(eq(usuariosAlmacenes.usuarioId, userId));
      if (almacenId) {
        await db.insert(usuariosAlmacenes).values({
          usuarioId: userId,
          almacenId: parseInt(almacenId),
          esPrincipal: 1,
        });
      }
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Error al actualizar usuario:', error);
    if (error.message === 'UNAUTHORIZED') return unauthorizedResponse();
    if (error.message === 'FORBIDDEN') return forbiddenResponse('No tienes permisos para editar usuarios');
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}

// DELETE - Eliminar usuario
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(request, 'admin.users.delete');

    const { id } = await params;
    const userId = parseInt(id);

    const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Borrar asignaciones de almacén antes de eliminar usuario (cascade lo hace, pero por claridad)
    await db.delete(usuariosAlmacenes).where(eq(usuariosAlmacenes.usuarioId, userId));
    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({ success: true, message: 'Usuario eliminado exitosamente' });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return unauthorizedResponse();
    if (error.message === 'FORBIDDEN') return forbiddenResponse('No tienes permisos para desactivar usuarios');
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
