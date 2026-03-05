'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/navigation';
import ModalEditarMovimiento from '@/components/modal-editar-movimiento';
import { Clock, XCircle, Edit3, Ban } from 'lucide-react';

interface Movimiento {
  id: number; estado: string; observaciones: string | null; transportadoPor: string | null;
  fechaSolicitud: string; fechaAprobacion: string | null;
  almacenDestino: { id: number; nombre: string };
  usuarioAprobador: { id: number; nombre: string } | null;
  detalles: Array<{ id: number; cantidad: number; producto: { id: number; codigo: string; nombre: string; tipo: string } }>;
}

const TIPO_EMOJI: Record<string, string> = {
  canastillo_negro: '⬛', canastillo_color: '🎨', cooler: '❄️', caja: '📦',
};

const TIPO_COLOR: Record<string, string> = {
  canastillo_negro: '#1f2937', canastillo_color: '#7c3aed',
  cooler: '#0284c7', caja: '#b45309',
};

export default function MisMovimientosPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);
  const [modalAnular, setModalAnular] = useState<{ open: boolean; movimientoId: number | null }>({ open: false, movimientoId: null });
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [movimientoEditar, setMovimientoEditar] = useState<Movimiento | null>(null);
  const [showModalEditar, setShowModalEditar] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (session?.user?.id) fetchMisMovimientos();
  }, [session, status, router]);

  const fetchMisMovimientos = async () => {
    if (!session?.user?.id) { setLoading(false); return; }
    try {
      const r = await fetch(`/api/mis-movimientos?usuarioId=${session.user.id}`);
      setMovimientos(await r.json());
    } catch {
      setMessage({ type: 'error', text: 'Error al cargar movimientos' });
    } finally { setLoading(false); }
  };

  const handleAnular = (movimientoId: number) => {
    setMotivoAnulacion('');
    setModalAnular({ open: true, movimientoId });
  };

  const confirmarAnulacion = async () => {
    const movimientoId = modalAnular.movimientoId;
    if (!movimientoId) return;
    setModalAnular({ open: false, movimientoId: null });
    setMessage(null); setProcessing(movimientoId);
    try {
      const res = await fetch(`/api/movimientos/${movimientoId}/anular`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observaciones: motivoAnulacion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al anular');
      setMessage({ type: 'success', text: 'Movimiento anulado exitosamente' });
      fetchMisMovimientos();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error desconocido' });
    } finally { setProcessing(null); setMotivoAnulacion(''); }
  };

  const handleEditar = (mov: Movimiento) => {
    setMovimientoEditar(mov);
    setShowModalEditar(true);
  };

  const movimientosFiltrados = movimientos.filter(m => m.estado === 'pendiente' || m.estado === 'rechazado');
  const pendientes = movimientosFiltrados.filter(m => m.estado === 'pendiente').length;
  const rechazados = movimientosFiltrados.filter(m => m.estado === 'rechazado').length;

  const estadoBadge = (estado: string) => {
    const map: Record<string, { label: string; bg: string; color: string }> = {
      pendiente: { label: 'Pendiente', bg: '#fffbeb', color: '#b45309' },
      rechazado: { label: 'Rechazado', bg: '#fff1f2', color: '#be123c' },
      aprobado: { label: 'Aprobado', bg: '#f0fdf4', color: '#166534' },
      anulado: { label: 'Anulado', bg: '#f9fafb', color: '#6b7280' },
    };
    const s = map[estado] || { label: estado, bg: '#f3f4f6', color: '#374151' };
    return (
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ background: s.bg, color: s.color }}
      >
        {s.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="main-content">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl text-gray-900">Mis Movimientos</h1>
            <p className="text-sm mt-1 text-muted-foreground">Historial de salidas registradas</p>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
              {message.text}
            </div>
          )}

          {/* KPI mini */}
          {!loading && movimientos.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="card-elevated p-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl kpi-icon-amber flex-shrink-0">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold leading-none font-sans">{pendientes}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mt-1 text-muted-foreground">Pendientes</p>
                </div>
              </div>
              <div className="card-elevated p-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl kpi-icon-red flex-shrink-0">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold leading-none font-sans">{rechazados}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mt-1 text-muted-foreground">Rechazados</p>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="card-elevated py-12 flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="text-muted-foreground">Cargando...</span>
            </div>
          ) : movimientosFiltrados.length === 0 ? (
            <div className="card-elevated py-12 text-center">
              <div className="mx-auto h-12 w-12 mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-700">No hay movimientos pendientes o rechazados</p>
              <p className="text-sm mt-1 text-muted-foreground">Todos tus movimientos han sido procesados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {movimientosFiltrados.map(mov => (
                <div key={mov.id} className="card-elevated overflow-hidden">

                  {/* Cabecera tarjeta */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        #{mov.id}
                      </span>
                      {estadoBadge(mov.estado)}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(mov.fechaSolicitud).toLocaleDateString('es-ES', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Cuerpo */}
                  <div className="px-4 py-3">
                    {/* Productos */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {mov.detalles.map(d => {
                        const color = TIPO_COLOR[d.producto.tipo] || '#374151';
                        return (
                          <span
                            key={d.id}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: color + '15', color }}
                          >
                            {TIPO_EMOJI[d.producto.tipo] || '📦'}
                            {d.producto.nombre}
                            <span className="font-bold ml-0.5">× {d.cantidad}</span>
                          </span>
                        );
                      })}
                    </div>

                    {/* Destino */}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      {mov.almacenDestino.nombre}
                      {mov.transportadoPor && <> · <span>{mov.transportadoPor}</span></>}
                    </p>

                    {/* Observaciones del rechazo */}
                    {mov.estado === 'rechazado' && mov.observaciones && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-red-700 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100">
                        <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span className="italic">{mov.observaciones}</span>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="px-4 pb-3 flex gap-2">
                    {mov.estado === 'rechazado' && (
                      <button
                        onClick={() => handleEditar(mov)}
                        disabled={processing === mov.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                        style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}
                      >
                        <Edit3 className="w-4 h-4" />
                        Editar y Reenviar
                      </button>
                    )}
                    {(mov.estado === 'pendiente' || mov.estado === 'rechazado') && (
                      <button
                        onClick={() => handleAnular(mov.id)}
                        disabled={processing === mov.id}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                        style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}
                      >
                        {processing === mov.id
                          ? <div className="animate-spin h-4 w-4 rounded-full border-2 border-current border-t-transparent" />
                          : <Ban className="w-4 h-4" />
                        }
                        Anular
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── Modal Editar Movimiento ── */}
      <ModalEditarMovimiento
        movimiento={movimientoEditar}
        open={showModalEditar}
        onClose={() => { setShowModalEditar(false); setMovimientoEditar(null); }}
        onSuccess={() => { fetchMisMovimientos(); setMessage({ type: 'success', text: 'Movimiento reenviado exitosamente' }); }}
      />

      {/* ── Modal Anulación ── */}
      {modalAnular.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModalAnular({ open: false, movimientoId: null })} />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
                <Ban className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Anular Movimiento</h3>
                <p className="text-xs text-gray-400">#{modalAnular.movimientoId} · Esta acción no se puede deshacer</p>
              </div>
            </div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              Motivo <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={motivoAnulacion}
              onChange={e => setMotivoAnulacion(e.target.value)}
              rows={3}
              placeholder="Ej: Error en la solicitud..."
              className="input-field resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setModalAnular({ open: false, movimientoId: null })}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAnulacion}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-colors"
                style={{ background: '#e11d48' }}
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
