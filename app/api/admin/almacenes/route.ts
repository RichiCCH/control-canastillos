import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { almacenes, users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Obtener todos los almacenes con información de usuarios asignados
export async function GET(request: NextRequest) {
  try {
    // Require admin permission to view almacenes
    await requirePermission(request, 'admin.almacenes.view');

    // Single query with LEFT JOIN + GROUP BY to count users per almacén
    const almacenesWithUserCount = await db
      .select({
        id: almacenes.id,
        nombre: almacenes.nombre,
        ubicacion: almacenes.ubicacion,
        descripcion: almacenes.descripcion,
        activo: almacenes.activo,
        createdAt: almacenes.createdAt,
        usuariosAsignados: sql<number>`count(${users.id})::int`,
      })
      .from(almacenes)
      .leftJoin(users, eq(users.almacenId, almacenes.id))
      .groupBy(almacenes.id, almacenes.nombre, almacenes.ubicacion, almacenes.descripcion, almacenes.activo, almacenes.createdAt);

    return NextResponse.json(almacenesWithUserCount);
  } catch (error) {
    console.error('Error al obtener almacenes:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para ver almacenes');
      }
    }

    return NextResponse.json(
      { error: 'Error al obtener almacenes' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo almacén
export async function POST(request: NextRequest) {
  try {
    // Require admin permission to create almacenes
    await requirePermission(request, 'admin.almacenes.create');

    const body = await request.json();
    const { nombre, ubicacion, descripcion } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    // Verificar si el nombre ya existe
    const existingAlmacen = await db
      .select()
      .from(almacenes)
      .where(eq(almacenes.nombre, nombre))
      .limit(1);

    if (existingAlmacen.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe un almacén con ese nombre' },
        { status: 400 }
      );
    }

    const newAlmacen = await db
      .insert(almacenes)
      .values({
        nombre,
        ubicacion: ubicacion || null,
        descripcion: descripcion || null,
        activo: 1, // Por defecto activo
      })
      .returning();

    return NextResponse.json({
      success: true,
      almacen: newAlmacen[0],
    });
  } catch (error) {
    console.error('Error al crear almacén:', error);

    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse('No tienes permisos para crear almacenes');
      }
    }

    return NextResponse.json(
      { error: 'Error al crear almacén' },
      { status: 500 }
    );
  }
}
