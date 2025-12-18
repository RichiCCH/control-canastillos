import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, almacenes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

// GET - Obtener todos los usuarios con información de almacén
export async function GET(request: NextRequest) {
  try {
    // Require admin permission to view users
    await requirePermission(request, 'admin.users.view');
    const allUsers = await db
      .select({
        id: users.id,
        nombre: users.nombre,
        email: users.email,
        rol: users.rol,
        almacenId: users.almacenId,
        createdAt: users.createdAt,
      })
      .from(users);

    // Obtener información de almacenes para cada usuario
    const usersWithAlmacen = await Promise.all(
      allUsers.map(async (user) => {
        if (user.almacenId) {
          const almacen = await db
            .select({
              id: almacenes.id,
              nombre: almacenes.nombre,
            })
            .from(almacenes)
            .where(eq(almacenes.id, user.almacenId))
            .limit(1);

          return {
            ...user,
            almacen: almacen[0] || null,
          };
        }
        return {
          ...user,
          almacen: null,
        };
      })
    );

    return NextResponse.json(usersWithAlmacen);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para ver usuarios');
      }
    }

    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo usuario
export async function POST(request: NextRequest) {
  try {
    // Require admin permission to create users
    await requirePermission(request, 'admin.users.create');

    const body = await request.json();
    const { nombre, email, rol, almacenId } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    if (!rol || !['admin', 'supervisor', 'operador'].includes(rol)) {
      return NextResponse.json(
        { error: 'Rol inválido' },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe
    if (email) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        return NextResponse.json(
          { error: 'El email ya está registrado' },
          { status: 400 }
        );
      }
    }

    const newUser = await db
      .insert(users)
      .values({
        nombre,
        email: email || null,
        rol,
        almacenId: almacenId || null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      user: newUser[0],
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para crear usuarios');
      }
    }

    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}
