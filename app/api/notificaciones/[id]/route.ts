import { NextRequest, NextResponse } from 'next/server';
import { marcarNotificacionComoLeida } from '@/lib/notifications';
import { requirePermission, unauthorizedResponse } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PATCH - Marcar una notificación como leída
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(request, 'inventario.view');
    const { id } = await params;

    const success = await marcarNotificacionComoLeida(parseInt(id));

    if (!success) {
      return NextResponse.json(
        { error: 'Error al marcar notificación como leída' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al marcar notificación:', error);

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return unauthorizedResponse();
    }

    return NextResponse.json(
      { error: 'Error al marcar notificación' },
      { status: 500 }
    );
  }
}
