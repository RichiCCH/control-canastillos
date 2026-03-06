import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, almacenes, usuariosAlmacenes } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ROLES_VALIDOS = ['admin', 'encargado', 'supervisor', 'operador'];

// GET - Obtener todos los usuarios con información de almacén(es)
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'admin.users.view');

    const allUsers = await db
      .select({
        id: users.id, nombre: users.nombre, email: users.email,
        rol: users.rol, almacenId: users.almacenId, createdAt: users.createdAt,
      })
      .from(users);

    // Obtener todos los almacenes en 1 query
    const almacenesData = await db.select({ id: almacenes.id, nombre: almacenes.nombre }).from(almacenes);
    const almMap = new Map(almacenesData.map(a => [a.id, a]));

    // Obtener asignaciones pivote para encargados en 1 query
    const encargadoIds = allUsers.filter(u => u.rol === 'encargado').map(u => u.id);
    let pivoteMap = new Map<number, { id: number; nombre: string }[]>();
    if (encargadoIds.length > 0) {
      const pivote = await db
        .select({ usuarioId: usuariosAlmacenes.usuarioId, almacenId: usuariosAlmacenes.almacenId })
        .from(usuariosAlmacenes)
        .where(inArray(usuariosAlmacenes.usuarioId, encargadoIds));
      for (const p of pivote) {
        const arr = pivoteMap.get(p.usuarioId) ?? [];
        const alm = almMap.get(p.almacenId);
        if (alm) arr.push(alm);
        pivoteMap.set(p.usuarioId, arr);
      }
    }

    const result = allUsers.map(u => ({
      ...u,
      almacen: u.almacenId ? (almMap.get(u.almacenId) ?? null) : null,
      almacenesAsignados: u.rol === 'encargado' ? (pivoteMap.get(u.id) ?? []) : [],
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return unauthorizedResponse();
    if (error.message === 'FORBIDDEN') return forbiddenResponse('No tienes permisos para ver usuarios');
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

// POST - Crear nuevo usuario
export async function POST(request: NextRequest) {
  try {
    await requirePermission(request, 'admin.users.create');

    const body = await request.json();
    const { nombre, email, password, rol, almacenId, almacenesIds } = body;

    if (!nombre) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    if (!rol || !ROLES_VALIDOS.includes(rol)) return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });

    // Para encargado, almacenesIds es requerido
    if (rol === 'encargado' && (!almacenesIds || almacenesIds.length === 0)) {
      return NextResponse.json({ error: 'Un encargado debe tener al menos un almacén asignado' }, { status: 400 });
    }

    if (email) {
      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
    }

    const hashedPassword = password?.trim() || null;

    // Almacén principal: para encargado es el primero de la lista; para otros es almacenId
    const almacenPrincipal = rol === 'encargado'
      ? (almacenesIds?.[0] ?? null)
      : (almacenId ?? null);

    const [newUser] = await db.insert(users).values({
      nombre, email: email || null, password: hashedPassword, rol,
      almacenId: almacenPrincipal,
    }).returning();

    // Si es encargado, insertar en la tabla pivote
    if (rol === 'encargado' && almacenesIds?.length > 0) {
      await db.insert(usuariosAlmacenes).values(
        almacenesIds.map((aid: number, idx: number) => ({
          usuarioId: newUser.id,
          almacenId: aid,
          esPrincipal: idx === 0 ? 1 : 0,
        }))
      ).onConflictDoNothing();
    } else if (almacenPrincipal) {
      // Operador/supervisor: insertar su único almacén en la pivote también
      await db.insert(usuariosAlmacenes).values({
        usuarioId: newUser.id, almacenId: almacenPrincipal, esPrincipal: 1,
      }).onConflictDoNothing();
    }

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') return unauthorizedResponse();
    if (error.message === 'FORBIDDEN') return forbiddenResponse('No tienes permisos para crear usuarios');
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}
