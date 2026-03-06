'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/navigation';
import { generarPDFSalida } from '@/lib/utils/pdf';
import { Package, X, Search, CheckCircle, XCircle } from 'lucide-react';

interface Almacen { id: number; nombre: string; }
interface Producto { id: number; codigo: string; nombre: string; tipo: string; unidadMedida: string; }
interface ProductoSel { productoId: number; producto: Producto; cantidad: number; }

export default function SalidaPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  // Origen (para encargados con múltiples almacenes)
  const [almacenOrigenId, setAlmacenOrigenId] = useState('');

  // Destino
  const [almacenDestinoId, setAlmacenDestinoId] = useState('');
  const [almacenDestinoNombre, setAlmacenDestinoNombre] = useState('');
  const [almacenBusqueda, setAlmacenBusqueda] = useState('');
  const [showAlmacenDropdown, setShowAlmacenDropdown] = useState(false);
  const almacenInputRef = useRef<HTMLInputElement>(null);
  const almacenDropRef = useRef<HTMLDivElement>(null);

  const [transportadoPor, setTransportadoPor] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [seleccionados, setSeleccionados] = useState<ProductoSel[]>([]);

  // Submodal productos
  const [productoActual, setProductoActual] = useState('');
  const [cantidadActual, setCantidadActual] = useState('');
  const [stock, setStock] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [modal, setModal] = useState(false);

  // Inicializar origen dependiendo del usuario
  const almacenesUsuario: { id: number, nombre: string }[] = (session?.user as any)?.almacenes || [];
  const esMultiAlmacen = almacenesUsuario.length > 0;
  const userAlmacenDefectoId = (session?.user as any)?.almacenId;

  useEffect(() => { update(); }, []);

  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);
  useEffect(() => {
    if (status !== 'authenticated') return;

    // Autoseleccionar origen si es multi-almacen pero no ha seleccionado nada
    if (esMultiAlmacen && !almacenOrigenId) {
      setAlmacenOrigenId(String(almacenesUsuario[0]?.id || userAlmacenDefectoId));
    } else if (!esMultiAlmacen && userAlmacenDefectoId) {
      setAlmacenOrigenId(String(userAlmacenDefectoId));
    }

    fetch('/api/almacenes').then(r => r.json()).then(setAlmacenes).catch(() => { });
    fetch('/api/productos').then(r => r.json()).then(setProductos).catch(() => { });
  }, [status, esMultiAlmacen, userAlmacenDefectoId]);

  // Cerrar dropdown al clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        almacenDropRef.current && !almacenDropRef.current.contains(e.target as Node) &&
        almacenInputRef.current && !almacenInputRef.current.contains(e.target as Node)
      ) {
        setShowAlmacenDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Consultar stock cuando cambia producto u origen
  useEffect(() => {
    if (!productoActual || !almacenOrigenId) { setStock(null); return; }
    fetch(`/api/inventario?almacenId=${almacenOrigenId}&productoId=${productoActual}`)
      .then(r => r.json())
      .then(d => setStock(d.length > 0 ? d[0].cantidad : 0))
      .catch(() => setStock(null));
  }, [productoActual, almacenOrigenId]);

  const agregar = () => {
    const cant = parseInt(cantidadActual);
    if (!productoActual || !cant || cant <= 0) return;
    const prod = productos.find(p => p.id === parseInt(productoActual));
    if (!prod || seleccionados.find(p => p.productoId === prod.id)) return;
    setSeleccionados(prev => [...prev, { productoId: prod.id, producto: prod, cantidad: cant }]);
    setProductoActual(''); setCantidadActual(''); setModal(false);
  };

  const cambiarCant = (id: number, delta: number) =>
    setSeleccionados(prev => prev.map(p =>
      p.productoId === id ? { ...p, cantidad: Math.max(1, p.cantidad + delta) } : p
    ));

  const quitar = (id: number) =>
    setSeleccionados(prev => prev.filter(p => p.productoId !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!session?.user?.id) return;
    const userId = parseInt(session.user.id);
    if (!almacenOrigenId) { setMsg({ ok: false, text: 'No tienes un almacén de origen válido.' }); return; }
    if (!almacenDestinoId) { setMsg({ ok: false, text: 'Selecciona un almacén de destino.' }); return; }
    if (almacenOrigenId === almacenDestinoId) { setMsg({ ok: false, text: 'El almacén destino no puede ser el mismo que el origen.' }); return; }
    if (!seleccionados.length) { setMsg({ ok: false, text: 'Agrega al menos un producto.' }); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          almacenOrigenId,  // Pasar el origen explícito!
          almacenDestinoId: parseInt(almacenDestinoId),
          usuarioSolicitanteId: userId,
          transportadoPor: transportadoPor || null,
          observaciones: observaciones || null,
          detalles: seleccionados.map(p => ({ productoId: p.productoId, cantidad: p.cantidad })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setMsg({ ok: true, text: 'Movimiento registrado correctamente.' });

      const users = await fetch('/api/users').then(r => r.json());
      const usuario = users.find((u: any) => u.id === userId);
      const origen = almacenes.find(a => a.id === parseInt(almacenOrigenId));
      const destino = almacenes.find(a => a.id === parseInt(almacenDestinoId));

      if (origen && destino && usuario) {
        generarPDFSalida({
          id: data.movimiento.id, estado: 'pendiente',
          fechaSolicitud: data.movimiento.fechaSolicitud || new Date().toISOString(),
          almacenOrigen: { id: origen.id, nombre: origen.nombre },
          almacenDestino: { id: destino.id, nombre: destino.nombre },
          usuarioSolicitante: { id: usuario.id, nombre: usuario.nombre },
          transportadoPor: transportadoPor || null, observaciones: observaciones || null,
          detalles: seleccionados.map(p => ({
            codigo: p.producto.codigo, nombre: p.producto.nombre,
            tipo: p.producto.tipo, cantidad: p.cantidad, unidadMedida: p.producto.unidadMedida,
          })),
        });
      }
      setAlmacenDestinoId(''); setAlmacenDestinoNombre(''); setAlmacenBusqueda('');
      setTransportadoPor(''); setObservaciones(''); setSeleccionados([]);
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || 'Error desconocido.' });
    } finally { setLoading(false); }
  };

  const totalUds = seleccionados.reduce((s, p) => s + p.cantidad, 0);

  // Opciones de destino
  const opcionesDestino = almacenes
    .filter(a => String(a.id) !== almacenOrigenId)
    .filter(a => almacenBusqueda.trim() === '' || a.nombre.toLowerCase().includes(almacenBusqueda.toLowerCase()));

  // Iconos emojis
  const TIPO_EMOJI: Record<string, string> = {
    canastillo_negro: '⬛', canastillo_color: '🎨', cooler: '❄️', caja: '📦',
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navigation />
      <div className="main-content">
        <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 lg:pt-8 pb-32 lg:pb-10">

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold lg:text-3xl text-gray-900">Registrar Salida</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Enviar productos a otro almacén</p>
          </div>

          {/* Message */}
          {msg && (
            <div className={`mb-5 p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${msg.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {msg.ok ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Configuración (Origen/Destino) */}
            <div className="card-elevated p-4 space-y-4 shadow-sm border border-gray-100">
              <h2 className="text-base font-semibold text-gray-800 font-display">Información de Envío</h2>

              {esMultiAlmacen && (
                <div className="space-y-1.5 p-3 rounded-xl bg-purple-50 border border-purple-100">
                  <label className="block text-sm font-bold text-purple-900 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    Almacén de Origen
                  </label>
                  <p className="text-xs text-purple-700 mb-2 font-medium">Desde qué almacén despacharás los productos:</p>
                  <select
                    value={almacenOrigenId}
                    onChange={e => {
                      setAlmacenOrigenId(e.target.value);
                      // Limpiar productos seleccionados ya que el stock cambió
                      setSeleccionados([]);
                    }}
                    className="input-field border-purple-200 bg-white ring-purple-500/20"
                    required
                  >
                    {almacenesUsuario.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {/* ── ALMACEN DESTINO (BUSCADOR INTELIGENTE) ── */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">
                    Almacén Destino <span className="text-red-500">*</span>
                  </label>
                  <div className="relative" ref={almacenDropRef}>
                    {/* Input buscador */}
                    <div
                      className={`input-field flex items-center gap-2 cursor-text transition-all ${showAlmacenDropdown ? 'ring-2 ring-blue-400 border-blue-400' : ''}`}
                      onClick={() => { setShowAlmacenDropdown(true); setTimeout(() => almacenInputRef.current?.focus(), 0); }}
                    >
                      <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <input
                        ref={almacenInputRef}
                        type="text"
                        className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
                        placeholder={almacenDestinoId ? almacenDestinoNombre : 'Buscar almacén...'}
                        value={showAlmacenDropdown ? almacenBusqueda : (almacenDestinoId ? almacenDestinoNombre : '')}
                        onChange={e => { setAlmacenBusqueda(e.target.value); setShowAlmacenDropdown(true); }}
                        onFocus={() => setShowAlmacenDropdown(true)}
                      />
                      {/* Botón limpiar */}
                      {almacenDestinoId && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setAlmacenDestinoId('');
                            setAlmacenDestinoNombre('');
                            setAlmacenBusqueda('');
                            almacenInputRef.current?.focus();
                          }}
                          className="flex-shrink-0 w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                        >
                          <X className="w-2.5 h-2.5 text-gray-600" strokeWidth={2.5} />
                        </button>
                      )}
                      {/* Indicador de selección */}
                      {almacenDestinoId && (
                        <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" strokeWidth={2.5} />
                      )}
                    </div>

                    {/* Dropdown lista */}
                    {showAlmacenDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-52 overflow-auto">
                        {opcionesDestino.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-gray-400 text-center">Sin resultados para "{almacenBusqueda}"</p>
                        ) : (
                          opcionesDestino.map(a => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => {
                                setAlmacenDestinoId(String(a.id));
                                setAlmacenDestinoNombre(a.nombre);
                                setAlmacenBusqueda('');
                                setShowAlmacenDropdown(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${almacenDestinoId === String(a.id)
                                  ? 'bg-blue-50 text-blue-700 font-semibold'
                                  : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                              <span>🏢 {a.nombre}</span>
                              {almacenDestinoId === String(a.id) && <CheckCircle className="w-3.5 h-3.5 text-blue-500" />}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Transportista */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">
                    Transportista <span className="font-normal" style={{ color: 'var(--text-4)' }}>(opcional)</span>
                  </label>
                  <input type="text" value={transportadoPor} onChange={e => setTransportadoPor(e.target.value)} placeholder="Nombre del transportista" className="input-field" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  Observaciones <span className="font-normal" style={{ color: 'var(--text-4)' }}>(opcional)</span>
                </label>
                <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Notas adicionales..." className="input-field resize-none" />
              </div>
            </div>

            {/* Productos */}
            <div className="card-elevated p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-800 font-display">Productos</h2>
                  {seleccionados.length > 0 && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-4)' }}>
                      {seleccionados.length} ítem{seleccionados.length !== 1 ? 's' : ''} · {totalUds} uds
                    </p>
                  )}
                </div>
                <button type="button" onClick={() => setModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-colors"
                  style={{ background: '#10b981' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Agregar
                </button>
              </div>

              {seleccionados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed cursor-pointer hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                  style={{ borderColor: 'var(--border)' }} onClick={() => setModal(true)}>
                  <Package className="h-10 w-10 mb-2 text-gray-300" />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-4)' }}>Toca para agregar productos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {seleccionados.map(item => (
                    <div key={item.productoId} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border" style={{ background: '#f9fafb', borderColor: 'var(--border)' }}>
                      <span className="text-lg">{TIPO_EMOJI[item.producto.tipo] || '📦'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.producto.nombre}</p>
                        <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-4)' }}>{item.producto.codigo}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button type="button" onClick={() => cambiarCant(item.productoId, -1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border bg-white shadow-sm text-gray-500 hover:bg-gray-50 transition-colors text-base font-bold"
                          style={{ borderColor: 'var(--border)' }}>−</button>
                        <span className="w-8 text-center text-sm font-bold text-gray-900 tabular-nums">{item.cantidad}</span>
                        <button type="button" onClick={() => cambiarCant(item.productoId, 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border bg-white shadow-sm text-gray-500 hover:bg-gray-50 transition-colors text-base font-bold"
                          style={{ borderColor: 'var(--border)' }}>+</button>
                      </div>
                      <button type="button" onClick={() => quitar(item.productoId)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                        <X className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading || !seleccionados.length}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2 shadow-sm"
              style={{ background: 'var(--primary)' }}>
              {loading ? (
                <><div className="animate-spin h-4 w-4 rounded-full border-b-2 border-white" /> Procesando...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
                  {totalUds > 0 ? `Confirmar Salida · ${totalUds} uds` : 'Confirmar Salida'}</>
              )}
            </button>

          </form>
        </main>
      </div>

      {/* Modal agregar producto */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModal(false)} />
          <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Agregar Producto</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Producto</label>
                <select value={productoActual} onChange={e => setProductoActual(e.target.value)} className="input-field" autoFocus>
                  <option value="">Seleccionar producto...</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{TIPO_EMOJI[p.tipo] || '📦'} {p.nombre} ({p.codigo})</option>
                  ))}
                </select>

                {productoActual && (
                  <div className="mt-2 px-3 py-2 rounded-xl flex items-center justify-between text-sm bg-gray-50 border border-gray-100">
                    <span className="text-gray-500 font-medium">Stock disponible:</span>
                    {stock === null ? (
                      <span className="text-gray-400">Cargando...</span>
                    ) : stock === 0 ? (
                      <span className="font-bold text-red-500">Sin stock</span>
                    ) : (
                      <span className="font-bold text-emerald-600 tabular-nums">{stock} uds</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Cantidad</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setCantidadActual(v => String(Math.max(0, parseInt(v || '0') - 1)))}
                    className="w-12 h-12 rounded-xl border bg-gray-50 text-gray-500 font-bold hover:bg-gray-100 transition-colors shadow-sm text-lg">
                    −
                  </button>
                  <input type="number" value={cantidadActual} onChange={e => setCantidadActual(e.target.value)} min="1" placeholder="0"
                    className="w-full h-12 text-center text-xl font-bold bg-white border rounded-xl focus:ring-2 focus:border-transparent outline-none ring-offset-1"
                    style={{ borderColor: 'var(--border)', outlineColor: 'var(--primary)' }}
                    onKeyDown={e => e.key === 'Enter' && agregar()}
                  />
                  <button type="button" onClick={() => setCantidadActual(v => String(parseInt(v || '0') + 1))}
                    className="w-12 h-12 rounded-xl border-t bg-emerald-50 text-emerald-600 border-emerald-200 font-bold hover:bg-emerald-100 transition-colors shadow-sm text-lg"
                    style={{ background: 'var(--primary)', color: 'white' }}>
                    +
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={agregar} disabled={!productoActual || !cantidadActual || parseInt(cantidadActual) <= 0}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-40"
                  style={{ background: '#10b981' }}>
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
