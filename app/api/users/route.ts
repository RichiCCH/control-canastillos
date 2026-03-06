import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, almacenes } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET - Obtener todos los usuarios con su almacén
export async function GET() {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        nombre: users.nombre,
        email: users.email,
        almacenId: users.almacenId,
        rol: users.rol,
        createdAt: users.createdAt,
        almacen: {
          id: almacenes.id,
          nombre: almacenes.nombre,
        },
      })
      .from(users)
      .leftJoin(almacenes, eq(users.almacenId, almacenes.id));

    return NextResponse.json(allUsers);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo usuario
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, email, almacenId, rol } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    const newUser = await db
      .insert(users)
      .values({
        nombre,
        email,
        almacenId: almacenId || null,
        rol: rol || 'operador',
      })
      .returning();

    return NextResponse.json(newUser[0], { status: 201 });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    );
  }
}
