import { NextRequest, NextResponse } from 'next/server';
import { obtenerNotificaciones, marcarNotificacionComoLeida, marcarTodasComoLeidas } from '@/lib/notifications';
import { requirePermission, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Obtener notificaciones del usuario
export async function GET(request: NextRequest) {
  try {
    const authUser = await requirePermission(request, 'inventario.view'); // Todos los usuarios autenticados
    const { searchParams } = new URL(request.url);
    const soloNoLeidas = searchParams.get('soloNoLeidas') === 'true';

    const notificaciones = await obtenerNotificaciones(authUser.id, soloNoLeidas);

    return NextResponse.json(notificaciones);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }

    return NextResponse.json(
      { error: 'Error al obtener notificaciones' },
      { status: 500 }
    );
  }
}

// PATCH - Marcar todas como leídas
export async function PATCH(request: NextRequest) {
  try {
    const authUser = await requirePermission(request, 'inventario.view');

    const success = await marcarTodasComoLeidas(authUser.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Error al marcar notificaciones como leídas' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al marcar notificaciones:', error);

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }

    return NextResponse.json(
      { error: 'Error al marcar notificaciones' },
      { status: 500 }
    );
  }
}
