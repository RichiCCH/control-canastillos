import { NextResponse } from 'next/server';
import { db } from '@/db';
import { almacenes } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET - Obtener todos los almacenes activos (para usar en formularios)
export async function GET() {
  try {
    const allAlmacenes = await db
      .select()
      .from(almacenes)
      .where(eq(almacenes.activo, 1)); // Solo almacenes activos

    return NextResponse.json(allAlmacenes);
  } catch (error) {
    console.error('Error al obtener almacenes:', error);
    return NextResponse.json(
      { error: 'Error al obtener almacenes' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo almacén
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, ubicacion, descripcion } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    const newAlmacen = await db
      .insert(almacenes)
      .values({
        nombre,
        ubicacion: ubicacion || null,
        descripcion: descripcion || null,
      })
      .returning();

    return NextResponse.json(newAlmacen[0], { status: 201 });
  } catch (error) {
    console.error('Error al crear almacén:', error);
    return NextResponse.json(
      { error: 'Error al crear almacén' },
      { status: 500 }
    );
  }
}
