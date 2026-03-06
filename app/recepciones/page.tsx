'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/navigation';
import { generarPDFRecepcion } from '@/lib/utils/pdf';
import { Search, Warehouse, CheckCircle, XCircle, FileText } from 'lucide-react';

interface Movimiento {
  id: number; estado: string; observaciones: string | null; fechaSolicitud: string;
  almacenOrigen: { id: number; nombre: string; };
  almacenDestino?: { id: number; nombre: string; };
  usuarioSolicitante: { id: number; nombre: string; };
  detalles: Array<{ id: number; cantidad: number; producto: { id: number; codigo: string; nombre: string; tipo: string; }; }>;
}

const TIPO_EMOJI: Record<string, string> = { canastillo_negro: '⬛', canastillo_color: '🎨', cooler: '❄️', caja: '📦' };

const fmt = (s: string) => new Date(s).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function RecepcionesPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [almacenes, setAlmacenes] = useState<Array<{ id: number; nombre: string }>>([]);
  const [modalRechazo, setModalRechazo] = useState<{ open: boolean; movimientoId: number | null }>({ open: false, movimientoId: null });
  const [motivoRechazo, setMotivoRechazo] = useState('');

  // Buscadores
  const [busqueda, setBusqueda] = useState('');
  const [fAlmacen, setFAlmacen] = useState('todos');

  // Refresh
  useEffect(() => { update(); }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (!session?.user) return;

    fetchAlmacenes();

    const rol = (session.user as any).rol || 'operador';
    const almacenId = (session.user as any).almacenId;
    const almacenesUsuario: { id: number }[] = (session.user as any).almacenes || [];

    if (rol === 'encargado' && almacenesUsuario.length > 0) {
      // Encargado: una sola llamada con todos sus almacenes
      const ids = almacenesUsuario.map((a: { id: number }) => a.id).join(',');
      fetch(`/api/movimientos?almacenesDestinoIds=${ids}`)
        .then(r => r.json())
        .then(data => setMovimientos(Array.isArray(data) ? data : []))
        .catch(() => setMessage({ type: 'error', text: 'Error al cargar movimientos' }))
        .finally(() => setLoading(false));
    } else if (almacenId) {
      fetch(`/api/movimientos?almacenDestinoId=${almacenId}`)
        .then(r => r.json())
        .then(data => setMovimientos(Array.isArray(data) ? data : []))
        .catch(() => setMessage({ type: 'error', text: 'Error al cargar movimientos' }))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
      setMessage({ type: 'error', text: 'Tu usuario no tiene un almacén asignado' });
    }
  }, [session, status, router]);

  const fetchAlmacenes = async () => {
    try { const r = await fetch('/api/almacenes'); setAlmacenes(await r.json()); } catch { }
  };

  const recargar = () => {
    const rol = (session?.user as any)?.rol;
    const almacenesUsuario: { id: number }[] = (session?.user as any)?.almacenes || [];
    const almacenId = (session?.user as any)?.almacenId;

    if (rol === 'encargado' && almacenesUsuario.length > 0) {
      const ids = almacenesUsuario.map((a: { id: number }) => a.id).join(',');
      fetch(`/api/movimientos?almacenesDestinoIds=${ids}`)
        .then(r => r.json())
        .then(data => setMovimientos(Array.isArray(data) ? data : []));
    } else if (almacenId) {
      fetch(`/api/movimientos?almacenDestinoId=${almacenId}`)
        .then(r => r.json())
        .then(data => setMovimientos(Array.isArray(data) ? data : []));
    }
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
      setMessage({ type: 'success', text: `Movimiento #${movimientoId} aprobado. Generando PDF...` });
      const movAprobado = movimientos.find(m => m.id === movimientoId);
      const almacenDestino = almacenes.find(a => a.id === (session.user as any)?.almacenId)
        ?? (movAprobado?.almacenDestino);
      if (movAprobado && almacenDestino) {
        generarPDFRecepcion({
          id: movAprobado.id, fechaSolicitud: movAprobado.fechaSolicitud,
          fechaAprobacion: new Date().toISOString(),
          almacenOrigen: movAprobado.almacenOrigen,
          almacenDestino,
          usuarioSolicitante: movAprobado.usuarioSolicitante,
          usuarioAprobador: { id: parseInt(session.user.id), nombre: session.user.name || 'Usuario' },
          observaciones: movAprobado.observaciones,
          detalles: movAprobado.detalles.map(d => ({ codigo: d.producto.codigo, nombre: d.producto.nombre, tipo: d.producto.tipo, cantidad: d.cantidad, unidadMedida: 'unidad' })),
        });
      }
      recargar();
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error desconocido' });
    } finally { setProcessing(null); }
  };

  const handleRechazar = (movimientoId: number) => {
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
      recargar();
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error desconocido' });
    } finally { setProcessing(null); setMotivoRechazo(''); }
  };

  const totalUnidades = (mov: Movimiento) => mov.detalles.reduce((s, d) => s + d.cantidad, 0);

  // Filtrado por búsqueda y almacén
  const filtrados = useMemo(() => {
    let items = [...movimientos];

    // Filtro por almacén de origen
    if (fAlmacen !== 'todos') {
      items = items.filter(m => m.almacenOrigen.id === parseInt(fAlmacen));
    }

    // Buscador: por número ID o nombre de almacén
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      items = items.filter(m =>
        String(m.id).includes(q) ||
        m.almacenOrigen.nombre.toLowerCase().includes(q) ||
        m.usuarioSolicitante.nombre.toLowerCase().includes(q) ||
        m.detalles.some(d => d.producto.nombre.toLowerCase().includes(q))
      );
    }

    return items;
  }, [movimientos, busqueda, fAlmacen]);

  // Almacenes origen únicos (para el filtro)
  const almacenesOrigen = useMemo(() => {
    const seen = new Map<number, string>();
    for (const m of movimientos) seen.set(m.almacenOrigen.id, m.almacenOrigen.nombre);
    return Array.from(seen.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [movimientos]);

  const isEncargado = (session?.user as any)?.rol === 'encargado';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="main-content">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 space-y-5 pb-8">

          {/* Header */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold lg:text-3xl text-gray-900">Recepciones Pendientes</h1>
              <p className="text-sm mt-1 text-muted-foreground">
                Aprueba o rechaza los envíos entrantes ·{' '}
                <span className="font-semibold text-amber-600">{filtrados.length} pendiente{filtrados.length !== 1 ? 's' : ''}</span>
              </p>
            </div>
          </div>

          {/* Mensaje */}
          {message && (
            <div className={`p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
              {message.type === 'success'
                ? <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                : <XCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
              }
              {message.text}
            </div>
          )}

          {/* Buscadores — solo si hay movimientos */}
          {!loading && movimientos.length > 0 && (
            <div className="card-elevated p-4 flex flex-col sm:flex-row gap-3 items-end">
              {/* Búsqueda por #ID, almacén, usuario */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar por #número, almacén origen, usuario o producto..."
                  className="input-field pl-9"
                />
              </div>

              {/* Filtro por almacén origen (útil cuando hay varios) */}
              {almacenesOrigen.length > 1 && (
                <div className="flex-shrink-0">
                  <label className="field-label flex items-center gap-1 mb-1">
                    <Warehouse className="w-3 h-3" /> Almacén origen
                  </label>
                  <select
                    value={fAlmacen}
                    onChange={e => setFAlmacen(e.target.value)}
                    className="input-field sm:w-48"
                  >
                    <option value="todos">Todos</option>
                    {almacenesOrigen.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {(busqueda || fAlmacen !== 'todos') && (
                <button
                  onClick={() => { setBusqueda(''); setFAlmacen('todos'); }}
                  className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 whitespace-nowrap"
                >
                  <XCircle className="w-4 h-4" /> Limpiar
                </button>
              )}
            </div>
          )}

          {/* Contenido */}
          {loading ? (
            <div className="card-elevated py-14 flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="text-muted-foreground">Cargando recepciones...</span>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="card-elevated py-14 text-center">
              <CheckCircle className="mx-auto h-12 w-12 mb-3 text-green-300" />
              <p className="font-medium text-gray-700">
                {movimientos.length === 0 ? 'No hay recepciones pendientes' : 'Sin resultados para esa búsqueda'}
              </p>
              <p className="text-sm mt-1 text-gray-400">
                {movimientos.length === 0 ? 'Todas las recepciones fueron procesadas' : 'Prueba cambiando los filtros'}
              </p>
            </div>
          ) : (
            /* ── Tabla de recepciones ── */
            <div className="card-elevated overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-12">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Origen</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Productos</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Solicitante</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtrados.map(mov => (
                      <tr key={mov.id} className="hover:bg-gray-50/50 transition-colors align-top">
                        {/* #ID */}
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                            #{mov.id}
                          </span>
                        </td>

                        {/* Almacén origen */}
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-1.5">
                            <Warehouse className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{mov.almacenOrigen.nombre}</p>
                              {mov.observaciones && (
                                <p className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                  {mov.observaciones}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Productos en fila */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {mov.detalles.map(d => (
                              <div key={d.id} className="flex items-center gap-2">
                                <span className="text-sm">{TIPO_EMOJI[d.producto.tipo] || '📦'}</span>
                                <span className="text-sm text-gray-700">{d.producto.nombre}</span>
                                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full">
                                  × {d.cantidad}
                                </span>
                              </div>
                            ))}
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              Total: <span className="font-semibold">{totalUnidades(mov)} unidades</span>
                            </p>
                          </div>
                        </td>

                        {/* Solicitante */}
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-700">{mov.usuarioSolicitante.nombre}</p>
                        </td>

                        {/* Fecha */}
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-500 whitespace-nowrap">{fmt(mov.fechaSolicitud)}</p>
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-end flex-wrap">
                            <button
                              onClick={() => handleAprobar(mov.id)}
                              disabled={processing === mov.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
                              style={{ background: '#ecfdf5', color: '#065f46' }}
                            >
                              {processing === mov.id
                                ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                                : <CheckCircle className="h-3.5 w-3.5" />
                              }
                              Aprobar
                            </button>
                            <button
                              onClick={() => handleRechazar(mov.id)}
                              disabled={processing === mov.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
                              style={{ background: '#fff1f2', color: '#9f1239', border: '1px solid rgba(244,63,94,0.2)' }}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Rechazar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                  <p className="text-xs text-gray-400">
                    {filtrados.length} recepción{filtrados.length !== 1 ? 'es' : ''} pendiente{filtrados.length !== 1 ? 's' : ''}
                    {movimientos.length !== filtrados.length && ` (de ${movimientos.length} totales)`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cards mobile */}
          {!loading && filtrados.length > 0 && (
            <div className="sm:hidden space-y-3">
              {/* ya cubierto por tabla en mobile con overflow-x */}
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
                <XCircle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Rechazar Movimiento</h3>
                <p className="text-xs text-gray-400">#{modalRechazo.movimientoId}</p>
              </div>
            </div>
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              Motivo <span className="font-normal text-gray-400">(opcional)</span>
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
              <button onClick={() => setModalRechazo({ open: false, movimientoId: null })}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmarRechazo}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors"
                style={{ background: '#e11d48' }}>
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
