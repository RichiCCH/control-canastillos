'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/navigation';
import ModalEditarMovimiento from '@/components/modal-editar-movimiento';
import {
  Clock, XCircle, Edit3, Ban, Filter, X, Search,
  ChevronLeft, ChevronRight, FileText,
} from 'lucide-react';
import { generarPDFSalida } from '@/lib/utils/pdf';

interface Movimiento {
  id: number; estado: string; observaciones: string | null; transportadoPor: string | null;
  fechaSolicitud: string; fechaAprobacion: string | null;
  almacenDestino: { id: number; nombre: string } | null;
  almacenOrigenId?: number | null;
  usuarioAprobador: { id: number; nombre: string } | null;
  detalles: Array<{ id: number; cantidad: number; producto: { id: number; codigo: string; nombre: string; tipo: string; unidadMedida: string } }>;
}

const TIPO_EMOJI: Record<string, string> = {
  canastillo_negro: '⬛', canastillo_color: '🎨', cooler: '❄️', caja: '📦',
};

const ESTADO_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pendiente: { bg: '#fffbeb', color: '#b45309', label: 'Pendiente' },
  aprobado:  { bg: '#f0fdf4', color: '#166534', label: 'Aprobado' },
  rechazado: { bg: '#fff1f2', color: '#be123c', label: 'Rechazado' },
  anulado:   { bg: '#f9fafb', color: '#6b7280', label: 'Anulado' },
};

const PER_PAGE = 15;

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
  const [expanded, setExpanded] = useState<number | null>(null);

  // Filtros
  const [fEstado, setFEstado] = useState('todos');
  const [fBusqueda, setFBusqueda] = useState('');
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (session?.user?.id) fetchMisMovimientos();
  }, [session, status, router]);

  const fetchMisMovimientos = async () => {
    if (!session?.user?.id) { setLoading(false); return; }
    try {
      const r = await fetch(`/api/mis-movimientos?usuarioId=${session.user.id}`);
      const data = await r.json();
      // Ordenar por fecha desc
      setMovimientos(Array.isArray(data) ? data.sort((a: Movimiento, b: Movimiento) =>
        new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime()
      ) : []);
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

  const formatDate = (s: string) => new Date(s).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  // Filtrado
  const filtered = useMemo(() => {
    let result = [...movimientos];
    if (fEstado !== 'todos') result = result.filter(m => m.estado === fEstado);
    if (fBusqueda.trim()) {
      const q = fBusqueda.trim().toLowerCase();
      result = result.filter(m =>
        String(m.id).includes(q) ||
        m.almacenDestino?.nombre.toLowerCase().includes(q) ||
        m.detalles.some(d => d.producto.nombre.toLowerCase().includes(q))
      );
    }
    if (fDesde) {
      const d = new Date(fDesde); d.setHours(0, 0, 0, 0);
      result = result.filter(m => new Date(m.fechaSolicitud) >= d);
    }
    if (fHasta) {
      const d = new Date(fHasta); d.setHours(23, 59, 59, 999);
      result = result.filter(m => new Date(m.fechaSolicitud) <= d);
    }
    return result;
  }, [movimientos, fEstado, fBusqueda, fDesde, fHasta]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const activeFilters = [fEstado !== 'todos', !!fBusqueda.trim(), !!fDesde, !!fHasta].filter(Boolean).length;

  const resetFiltros = () => {
    setFEstado('todos'); setFBusqueda(''); setFDesde(''); setFHasta('');
    setPage(1);
  };

  // Stats
  const stats = useMemo(() => ({
    total: movimientos.length,
    pendientes: movimientos.filter(m => m.estado === 'pendiente').length,
    rechazados: movimientos.filter(m => m.estado === 'rechazado').length,
    aprobados:  movimientos.filter(m => m.estado === 'aprobado').length,
  }), [movimientos]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="main-content">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 space-y-5 pb-8">

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold lg:text-3xl text-gray-900">Mis Movimientos</h1>
              <p className="text-sm mt-1 text-muted-foreground">
                {filtered.length} movimiento{filtered.length !== 1 ? 's' : ''}
                {activeFilters > 0 && <span className="ml-1 text-blue-600">(filtrando)</span>}
              </p>
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors relative"
              style={{
                background: showFilters ? '#eff6ff' : '#f9fafb',
                color: showFilters ? '#1d4ed8' : '#374151',
                border: showFilters ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
              }}
            >
              <Filter className="w-4 h-4" /> Filtros
              {activeFilters > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </button>
          </div>

          {/* ── Mensaje ── */}
          {message && (
            <div className={`p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
              <button onClick={() => setMessage(null)} className="ml-auto"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* ── Stats ── */}
          {!loading && movimientos.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Total', v: stats.total, bg: '#eff6ff', color: '#1d4ed8' },
                { label: 'Aprobados', v: stats.aprobados, bg: '#f0fdf4', color: '#166534' },
                { label: 'Pendientes', v: stats.pendientes, bg: '#fffbeb', color: '#b45309' },
                { label: 'Rechazados', v: stats.rechazados, bg: '#fff1f2', color: '#be123c' },
              ].map(s => (
                <div key={s.label} className="card-elevated p-3 text-center" style={{ background: s.bg }}>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.v}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: s.color + 'bb' }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Panel de filtros ── */}
          {showFilters && (
            <div className="card-elevated p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text" value={fBusqueda} onChange={e => { setFBusqueda(e.target.value); setPage(1); }}
                  placeholder="Buscar por #ID, destino o producto..."
                  className="input-field pl-9"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="field-label">Estado</label>
                  <select value={fEstado} onChange={e => { setFEstado(e.target.value); setPage(1); }} className="input-field">
                    <option value="todos">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="rechazado">Rechazado</option>
                    <option value="anulado">Anulado</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Desde</label>
                  <input type="date" value={fDesde} onChange={e => { setFDesde(e.target.value); setPage(1); }} className="input-field" />
                </div>
                <div>
                  <label className="field-label">Hasta</label>
                  <input type="date" value={fHasta} onChange={e => { setFHasta(e.target.value); setPage(1); }} className="input-field" />
                </div>
              </div>
              {activeFilters > 0 && (
                <button onClick={resetFiltros} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
                  <X className="w-3.5 h-3.5" /> Limpiar filtros
                </button>
              )}
            </div>
          )}

          {/* ── Tabla ── */}
          <div className="card-elevated overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <span className="text-sm text-gray-400">Cargando...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mx-auto h-12 w-12 mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <p className="font-semibold text-gray-600">Sin movimientos</p>
                <p className="text-sm mt-1 text-muted-foreground">
                  {activeFilters > 0 ? 'Prueba cambiando los filtros' : 'Aún no has registrado ningún movimiento'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-12">#ID</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Destino</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Productos</th>
                        <th className="px-4 py-3 w-28"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map(m => {
                        const es = ESTADO_STYLE[m.estado] || { bg: '#f3f4f6', color: '#374151', label: m.estado };
                        const isExp = expanded === m.id;
                        return (
                          <React.Fragment key={m.id}>
                            <tr
                              className={`border-b border-gray-50 cursor-pointer transition-colors ${isExp ? 'bg-blue-50/30' : 'hover:bg-gray-50/60'}`}
                              onClick={() => setExpanded(isExp ? null : m.id)}
                            >
                              <td className="px-4 py-3">
                                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">#{m.id}</span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(m.fechaSolicitud)}</td>
                              <td className="px-4 py-3">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: es.bg, color: es.color }}>
                                  {es.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600">{m.almacenDestino?.nombre || '—'}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {m.detalles.slice(0, 2).map(d => (
                                    <span key={d.id} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                      {TIPO_EMOJI[d.producto.tipo]} {d.cantidad}
                                    </span>
                                  ))}
                                  {m.detalles.length > 2 && (
                                    <span className="text-[10px] text-gray-400">+{m.detalles.length - 2}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                <div className="flex gap-1 justify-end">
                                  <button
                                    onClick={() => generarPDFSalida({
                                      id: m.id, estado: m.estado,
                                      fechaSolicitud: m.fechaSolicitud,
                                      fechaAprobacion: m.fechaAprobacion || undefined,
                                      almacenOrigen: { id: 0, nombre: '—' },
                                      almacenDestino: m.almacenDestino || { id: 0, nombre: '—' },
                                      usuarioSolicitante: { id: parseInt(session?.user?.id || '0'), nombre: session?.user?.name || '—' },
                                      usuarioAprobador: m.usuarioAprobador || undefined,
                                      transportadoPor: m.transportadoPor || undefined,
                                      observaciones: m.observaciones || undefined,
                                      detalles: m.detalles.map(d => ({ ...d.producto, cantidad: d.cantidad })),
                                    })}
                                    title="PDF"
                                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                  {m.estado === 'rechazado' && (
                                    <button
                                      onClick={() => handleEditar(m)}
                                      disabled={processing === m.id}
                                      title="Editar y reenviar"
                                      className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors disabled:opacity-50"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {(m.estado === 'pendiente' || m.estado === 'rechazado') && (
                                    <button
                                      onClick={() => handleAnular(m.id)}
                                      disabled={processing === m.id}
                                      title="Anular"
                                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                                    >
                                      {processing === m.id
                                        ? <div className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent" />
                                        : <Ban className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {/* Fila expandida */}
                            {isExp && (
                              <tr className="bg-blue-50/20">
                                <td colSpan={6} className="px-6 py-3 border-b border-blue-100">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase text-gray-400 mb-2">Productos</p>
                                      <div className="space-y-1">
                                        {m.detalles.map(d => (
                                          <div key={d.id} className="flex items-center justify-between text-sm">
                                            <span className="text-gray-700">{TIPO_EMOJI[d.producto.tipo]} {d.producto.nombre}</span>
                                            <span className="font-bold text-blue-700">{d.cantidad} {d.producto.unidadMedida}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="space-y-1.5 text-xs text-gray-500">
                                      <p>Destino: <span className="font-semibold text-gray-700">{m.almacenDestino?.nombre || '—'}</span></p>
                                      {m.usuarioAprobador && <p>Aprobado por: <span className="font-semibold text-gray-700">{m.usuarioAprobador.nombre}</span></p>}
                                      {m.transportadoPor && <p>Transportista: <span className="font-semibold text-gray-700">{m.transportadoPor}</span></p>}
                                      {m.observaciones && (
                                        <p className={m.estado === 'rechazado' ? 'text-red-600' : ''}>
                                          {m.estado === 'rechazado' ? 'Motivo rechazo: ' : 'Obs.: '}
                                          <span className="italic">{m.observaciones}</span>
                                        </p>
                                      )}
                                      {m.fechaAprobacion && <p>Procesado: <span className="font-semibold text-gray-700">{formatDate(m.fechaAprobacion)}</span></p>}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-gray-50">
                  {paged.map(m => {
                    const es = ESTADO_STYLE[m.estado] || { bg: '#f3f4f6', color: '#374151', label: m.estado };
                    const isExp = expanded === m.id;
                    return (
                      <div key={m.id} className={`p-4 ${isExp ? 'bg-blue-50/20' : ''}`} onClick={() => setExpanded(isExp ? null : m.id)}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">#{m.id}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: es.bg, color: es.color }}>{es.label}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">{formatDate(m.fechaSolicitud)}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1.5">→ {m.almacenDestino?.nombre || '—'}</p>
                        <div className="flex flex-wrap gap-1">
                          {m.detalles.map(d => (
                            <span key={d.id} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              {TIPO_EMOJI[d.producto.tipo]} {d.producto.nombre} × {d.cantidad}
                            </span>
                          ))}
                        </div>
                        {isExp && (
                          <div className="mt-3 flex gap-2" onClick={e => e.stopPropagation()}>
                            {m.estado === 'rechazado' && (
                              <button onClick={() => handleEditar(m)}
                                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700">
                                <Edit3 className="w-3.5 h-3.5" /> Editar y Reenviar
                              </button>
                            )}
                            {(m.estado === 'pendiente' || m.estado === 'rechazado') && (
                              <button onClick={() => handleAnular(m.id)} disabled={processing === m.id}
                                className="flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold bg-red-50 text-red-700 disabled:opacity-50">
                                <Ban className="w-3.5 h-3.5" /> Anular
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                    <p className="text-xs text-gray-400">
                      {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, filtered.length)} de {filtered.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-gray-200 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                        return start + i;
                      }).map(p => (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${p === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 text-gray-600'}`}>
                          {p}
                        </button>
                      ))}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-gray-200 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>

      {/* ── Modal Editar ── */}
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
