import { db } from '@/db';
import { notificaciones, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { enviarPushAUsuario } from './push';

export async function crearNotificacionNuevoMovimiento(
  movimientoId: number,
  almacenDestinoId: number,
  almacenOrigenNombre: string,
  usuarioSolicitanteNombre: string
) {
  try {
    // Obtener todos los usuarios del almacén destino
    const usuariosDestino = await db
      .select({
        id: users.id,
        nombre: users.nombre,
      })
      .from(users)
      .where(eq(users.almacenId, almacenDestinoId));

    // Crear notificación para cada usuario del almacén destino
    for (const usuario of usuariosDestino) {
      const titulo = 'Nuevo envío recibido';
      const mensaje = `${usuarioSolicitanteNombre} te ha enviado productos desde ${almacenOrigenNombre}. Revisa la sección de Recepciones para aprobar o rechazar.`;
      await db.insert(notificaciones).values({
        usuarioId: usuario.id,
        movimientoId: movimientoId,
        tipo: 'nuevo_movimiento',
        titulo,
        mensaje,
      });
      enviarPushAUsuario(usuario.id, titulo, mensaje, '/recepciones').catch(() => {});
    }

    return true;
  } catch (error) {
    console.error('Error al crear notificación:', error);
    return false;
  }
}

export async function crearNotificacionMovimientoAprobado(
  movimientoId: number,
  usuarioSolicitanteId: number,
  almacenDestinoNombre: string,
  usuarioAprobadorNombre: string
) {
  try {
    const titulo = 'Envío aprobado';
    const mensaje = `${usuarioAprobadorNombre} de ${almacenDestinoNombre} ha aprobado tu envío.`;
    await db.insert(notificaciones).values({
      usuarioId: usuarioSolicitanteId,
      movimientoId: movimientoId,
      tipo: 'movimiento_aprobado',
      titulo,
      mensaje,
    });
    enviarPushAUsuario(usuarioSolicitanteId, titulo, mensaje, '/mis-movimientos').catch(() => {});

    return true;
  } catch (error) {
    console.error('Error al crear notificación de aprobación:', error);
    return false;
  }
}

export async function crearNotificacionMovimientoRechazado(
  movimientoId: number,
  usuarioSolicitanteId: number,
  almacenDestinoNombre: string,
  usuarioAprobadorNombre: string,
  motivo?: string
) {
  try {
    const mensaje = motivo
      ? `${usuarioAprobadorNombre} de ${almacenDestinoNombre} ha rechazado tu envío. Motivo: ${motivo}`
      : `${usuarioAprobadorNombre} de ${almacenDestinoNombre} ha rechazado tu envío.`;

    await db.insert(notificaciones).values({
      usuarioId: usuarioSolicitanteId,
      movimientoId: movimientoId,
      tipo: 'movimiento_rechazado',
      titulo: 'Envío rechazado',
      mensaje: mensaje,
    });
    enviarPushAUsuario(usuarioSolicitanteId, 'Envío rechazado', mensaje, '/mis-movimientos').catch(() => {});

    return true;
  } catch (error) {
    console.error('Error al crear notificación de rechazo:', error);
    return false;
  }
}

export async function obtenerNotificaciones(usuarioId: number, soloNoLeidas: boolean = false) {
  try {
    const query = db
      .select({
        id: notificaciones.id,
        tipo: notificaciones.tipo,
        titulo: notificaciones.titulo,
        mensaje: notificaciones.mensaje,
        leida: notificaciones.leida,
        createdAt: notificaciones.createdAt,
        movimientoId: notificaciones.movimientoId,
      })
      .from(notificaciones)
      .where(eq(notificaciones.usuarioId, usuarioId))
      .orderBy(notificaciones.createdAt);

    const results = await query;

    if (soloNoLeidas) {
      return results.filter(n => !n.leida);
    }

    return results;
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    return [];
  }
}

export async function marcarNotificacionComoLeida(notificacionId: number) {
  try {
    await db
      .update(notificaciones)
      .set({ leida: true })
      .where(eq(notificaciones.id, notificacionId));

    return true;
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    return false;
  }
}

export async function marcarTodasComoLeidas(usuarioId: number) {
  try {
    await db
      .update(notificaciones)
      .set({ leida: true })
      .where(eq(notificaciones.usuarioId, usuarioId));

    return true;
  } catch (error) {
    console.error('Error al marcar todas como leídas:', error);
    return false;
  }
}

// Generic notification creation function
export async function crearNotificacion(
  usuarioId: number,
  movimientoId: number,
  tipo: string,
  titulo: string,
  mensaje: string
) {
  try {
    await db.insert(notificaciones).values({
      usuarioId: usuarioId,
      movimientoId: movimientoId,
      tipo: tipo,
      titulo: titulo,
      mensaje: mensaje,
    });

    return true;
  } catch (error) {
    console.error('Error al crear notificación:', error);
    return false;
  }
}
