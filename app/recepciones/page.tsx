'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/navigation';
import { generarPDFRecepcion } from '@/lib/utils/pdf';

interface Movimiento {
  id: number; estado: string; observaciones: string | null; fechaSolicitud: string;
  almacenOrigen: { id: number; nombre: string; };
  usuarioSolicitante: { id: number; nombre: string; };
  detalles: Array<{ id: number; cantidad: number; producto: { id: number; codigo: string; nombre: string; tipo: string; }; }>;
}

const TIPO_EMOJI: Record<string, string> = { canastillo_negro: '⬛', canastillo_color: '🎨', cooler: '❄️', caja: '📦' };

export default function RecepcionesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userAlmacenId, setUserAlmacenId] = useState<number | null>(null);
  const [almacenes, setAlmacenes] = useState<Array<{ id: number; nombre: string }>>([]);
  const [modalRechazo, setModalRechazo] = useState<{ open: boolean; movimientoId: number | null }>({ open: false, movimientoId: null });
  const [motivoRechazo, setMotivoRechazo] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (session?.user) {
      const almacenId = (session.user as any).almacenId;
      fetchAlmacenes();
      if (almacenId) { setUserAlmacenId(almacenId); fetchMovimientos(almacenId); }
      else { setLoading(false); setMessage({ type: 'error', text: 'Tu usuario no tiene un almacén asignado' }); }
    }
  }, [session, status, router]);

  const fetchAlmacenes = async () => {
    try { const r = await fetch('/api/almacenes'); setAlmacenes(await r.json()); } catch {}
  };

  const fetchMovimientos = async (almacenId: number) => {
    try { const r = await fetch(`/api/movimientos?almacenDestinoId=${almacenId}`); setMovimientos(await r.json()); }
    catch { setMessage({ type: 'error', text: 'Error al cargar movimientos' }); }
    finally { setLoading(false); }
  };

  const handleAprobar = async (movimientoId: number) => {
    if (!session?.user?.id) return;
    setProcessing(movimientoId); setMessage(null);
    try {
      const response = await fetch(`/api/movimientos/${movimientoId}/aprobar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioAprobadorId: parseInt(session.user.id) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al aprobar');
      setMessage({ type: 'success', text: 'Movimiento aprobado exitosamente' });
      const movAprobado = movimientos.find(m => m.id === movimientoId);
      const almacenDestino = almacenes.find(a => a.id === userAlmacenId);
      if (movAprobado && almacenDestino) {
        generarPDFRecepcion({
          id: movAprobado.id, fechaSolicitud: movAprobado.fechaSolicitud,
          fechaAprobacion: new Date().toISOString(),
          almacenOrigen: movAprobado.almacenOrigen,
          almacenDestino: { id: almacenDestino.id, nombre: almacenDestino.nombre },
          usuarioSolicitante: movAprobado.usuarioSolicitante,
          usuarioAprobador: { id: parseInt(session.user.id), nombre: session.user.name || 'Usuario' },
          observaciones: movAprobado.observaciones,
          detalles: movAprobado.detalles.map(d => ({ codigo: d.producto.codigo, nombre: d.producto.nombre, tipo: d.producto.tipo, cantidad: d.cantidad, unidadMedida: 'unidad' })),
        });
      }
      if (userAlmacenId) fetchMovimientos(userAlmacenId);
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error desconocido' });
    } finally { setProcessing(null); }
  };

  const handleRechazar = (movimientoId: number) => {
    if (!session?.user?.id) { setMessage({ type: 'error', text: 'No estás autenticado' }); return; }
    setMotivoRechazo(''); setModalRechazo({ open: true, movimientoId });
  };

  const confirmarRechazo = async () => {
    const movimientoId = modalRechazo.movimientoId;
    if (!movimientoId || !session?.user?.id) return;
    setModalRechazo({ open: false, movimientoId: null }); setProcessing(movimientoId); setMessage(null);
    try {
      const response = await fetch(`/api/movimientos/${movimientoId}/rechazar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioAprobadorId: parseInt(session.user.id), observaciones: motivoRechazo }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al rechazar');
      setMessage({ type: 'success', text: 'Movimiento rechazado' });
      if (userAlmacenId) fetchMovimientos(userAlmacenId);
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error desconocido' });
    } finally { setProcessing(null); setMotivoRechazo(''); }
  };

  const totalUnidades = (mov: Movimiento) => mov.detalles.reduce((s, d) => s + d.cantidad, 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navigation />
      <div className="main-content">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl text-gray-900">Recepciones Pendientes</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Aprueba o rechaza los envíos entrantes</p>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {message.type === 'success'
                ? <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                : <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
              }
              {message.text}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="card-elevated py-12 flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary)' }} />
              <span style={{ color: 'var(--text-3)' }}>Cargando...</span>
            </div>
          ) : !userAlmacenId ? (
            <div className="card-elevated py-12 text-center">
              <svg className="mx-auto h-12 w-12 mb-3" style={{ color: 'var(--text-4)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="font-medium text-gray-700">Sin almacén asignado</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-4)' }}>Contacta a un administrador</p>
            </div>
          ) : movimientos.length === 0 ? (
            <div className="card-elevated py-12 text-center">
              <svg className="mx-auto h-12 w-12 mb-3" style={{ color: 'var(--text-4)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium text-gray-700">No hay recepciones pendientes</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-4)' }}>Todas las recepciones fueron procesadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {movimientos.map(mov => (
                <div key={mov.id} className="card-elevated p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Icon + Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0" style={{ background: '#eff6ff' }}>
                        <svg className="h-5 w-5" style={{ color: 'var(--primary)' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-gray-800">
                            {mov.detalles.map(d => `${TIPO_EMOJI[d.producto.tipo] || '📦'} ${d.producto.nombre} × ${d.cantidad}`).join(', ')}
                          </p>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                          De: <span className="font-medium">{mov.almacenOrigen.nombre}</span>
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                          {mov.usuarioSolicitante.nombre} · {new Date(mov.fechaSolicitud).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          {' '}· <span className="font-semibold">{totalUnidades(mov)} uds</span>
                        </p>
                        {mov.observaciones && (
                          <p className="text-xs mt-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">{mov.observaciones}</p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleAprobar(mov.id)}
                        disabled={processing === mov.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                        style={{ background: '#ecfdf5', color: '#065f46' }}
                      >
                        {processing === mov.id
                          ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                          : <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        }
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleRechazar(mov.id)}
                        disabled={processing === mov.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                        style={{ background: '#fff1f2', color: '#9f1239', border: '1px solid rgba(244,63,94,0.2)' }}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Rechazo */}
      {modalRechazo.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalRechazo({ open: false, movimientoId: null })} />
          <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#fff1f2' }}>
                <svg className="w-5 h-5" style={{ color: '#e11d48' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Rechazar Movimiento</h3>
                <p className="text-xs" style={{ color: 'var(--text-4)' }}>#{modalRechazo.movimientoId}</p>
              </div>
            </div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              Motivo <span className="font-normal" style={{ color: 'var(--text-4)' }}>(opcional)</span>
            </label>
            <textarea
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
              rows={3}
              placeholder="Ej: Stock incorrecto, producto equivocado..."
              className="input-field resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setModalRechazo({ open: false, movimientoId: null })} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors">Cancelar</button>
              <button onClick={confirmarRechazo} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors" style={{ background: '#e11d48' }}>Confirmar Rechazo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
