import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requirePermission, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST - Guardar suscripción push
export async function POST(request: NextRequest) {
  try {
    const authUser = await requirePermission(request, 'inventario.view');
    const { endpoint, keys } = await request.json();

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Datos de suscripción inválidos' }, { status: 400 });
    }

    await db
      .insert(pushSubscriptions)
      .values({ usuarioId: authUser.id, endpoint, p256dh: keys.p256dh, auth: keys.auth })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { p256dh: keys.p256dh, auth: keys.auth, usuarioId: authUser.id },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return unauthorizedResponse();
    return NextResponse.json({ error: 'Error al guardar suscripción' }, { status: 500 });
  }
}

// DELETE - Eliminar suscripción push
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await requirePermission(request, 'inventario.view');
    const { endpoint } = await request.json();

    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.usuarioId, authUser.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') return unauthorizedResponse();
    return NextResponse.json({ error: 'Error al eliminar suscripción' }, { status: 500 });
  }
}

// GET - Obtener clave pública VAPID
export async function GET() {
  return NextResponse.json({ publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY });
}
