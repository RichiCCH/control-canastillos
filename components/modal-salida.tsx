'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { generarPDFSalida } from '@/lib/utils/pdf';

interface Almacen {
  id: number;
  nombre: string;
}

interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  unidadMedida: string;
}

interface ProductoSeleccionado {
  productoId: number;
  producto: Producto;
  cantidad: number;
}

interface ModalSalidaProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TIPO_EMOJI: Record<string, string> = {
  canastillo_negro: '⬛',
  canastillo_color: '🎨',
  cooler: '❄️',
  caja: '📦',
};

export default function ModalSalida({ open, onClose, onSuccess }: ModalSalidaProps) {
  const { data: session } = useSession();
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [almacenDestinoId, setAlmacenDestinoId] = useState('');
  const [transportadoPor, setTransportadoPor] = useState('');
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoSeleccionado[]>([]);
  const [productoActual, setProductoActual] = useState('');
  const [cantidadActual, setCantidadActual] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showProductoModal, setShowProductoModal] = useState(false);
  const [stockDisponible, setStockDisponible] = useState<number | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ── Buscador de almacén destino ──
  const [almacenBusqueda, setAlmacenBusqueda] = useState('');
  const [showAlmacenDropdown, setShowAlmacenDropdown] = useState(false);
  const [almacenDestinoNombre, setAlmacenDestinoNombre] = useState('');
  const almacenInputRef = useRef<HTMLInputElement>(null);
  const almacenDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !dataLoaded) {
      fetchAlmacenes();
      fetchProductos();
      setDataLoaded(true);
    }
    if (!open) {
      setAlmacenDestinoId('');
      setAlmacenDestinoNombre('');
      setAlmacenBusqueda('');
      setTransportadoPor('');
      setProductosSeleccionados([]);
      setObservaciones('');
      setMessage(null);
      setShowProductoModal(false);
      setShowAlmacenDropdown(false);
      setDataLoaded(false);
    }
  }, [open]);

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

  useEffect(() => {
    if (!productoActual || !session?.user) { setStockDisponible(null); return; }
    const userAlmacenId = (session.user as any)?.almacenId;
    if (!userAlmacenId) return;
    fetch(`/api/inventario?almacenId=${userAlmacenId}&productoId=${productoActual}`)
      .then(r => r.json())
      .then(data => setStockDisponible(data.length > 0 ? data[0].cantidad : 0))
      .catch(() => setStockDisponible(null));
  }, [productoActual, session]);

  const fetchAlmacenes = async () => {
    try { const r = await fetch('/api/almacenes'); setAlmacenes(await r.json()); } catch { }
  };

  const fetchProductos = async () => {
    try { const r = await fetch('/api/productos'); setProductos(await r.json()); } catch { }
  };

  const agregarProducto = () => {
    if (!productoActual || !cantidadActual) {
      setMessage({ type: 'error', text: 'Selecciona un producto y cantidad' });
      return;
    }
    const cantidad = parseInt(cantidadActual);
    if (cantidad <= 0) { setMessage({ type: 'error', text: 'La cantidad debe ser mayor a 0' }); return; }
    const producto = productos.find(p => p.id === parseInt(productoActual));
    if (!producto) return;
    if (productosSeleccionados.find(p => p.productoId === producto.id)) {
      setMessage({ type: 'error', text: 'Este producto ya está agregado. Edita la cantidad.' });
      return;
    }
    setProductosSeleccionados(prev => [...prev, { productoId: producto.id, producto, cantidad }]);
    setProductoActual('');
    setCantidadActual('');
    setMessage(null);
    setShowProductoModal(false);
  };

  const eliminarProducto = (productoId: number) =>
    setProductosSeleccionados(prev => prev.filter(p => p.productoId !== productoId));

  const actualizarCantidad = (productoId: number, cantidad: number) => {
    if (cantidad <= 0) return;
    setProductosSeleccionados(prev => prev.map(p => p.productoId === productoId ? { ...p, cantidad } : p));
  };

  const almacenesUsuario: { id: number, nombre: string }[] = (session?.user as any)?.almacenes || [];
  const esMultiAlmacen = almacenesUsuario.length > 0;
  const userAlmacenDefectoId = (session?.user as any)?.almacenId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!session?.user?.id) { setMessage({ type: 'error', text: 'No estás autenticado' }); return; }

    // Determinar origen
    const origenFinalId = almacenOrigenId || (esMultiAlmacen ? String(almacenesUsuario[0]?.id) : String(userAlmacenDefectoId));

    if (!origenFinalId || origenFinalId === 'undefined') { setMessage({ type: 'error', text: 'No tienes un almacén de origen válido' }); return; }
    if (!almacenDestinoId) { setMessage({ type: 'error', text: 'Selecciona un almacén de destino' }); return; }
    if (origenFinalId === almacenDestinoId) { setMessage({ type: 'error', text: 'El almacén de destino no puede ser igual al de origen' }); return; }
    if (productosSeleccionados.length === 0) { setMessage({ type: 'error', text: 'Agrega al menos un producto' }); return; }

    const userId = parseInt(session.user.id);
    setLoading(true);
    try {
      const response = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          almacenDestinoId: parseInt(almacenDestinoId),
          usuarioSolicitanteId: userId,
          transportadoPor: transportadoPor || null,
          observaciones: observaciones || null,
          detalles: productosSeleccionados.map(p => ({ productoId: p.productoId, cantidad: p.cantidad })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al crear movimiento');

      try {
        const usersRes = await fetch('/api/users');
        const users = await usersRes.json();
        const usuario = users.find((u: { id: number }) => u.id === userId);
        const almacenOrigen = almacenes.find(a => a.id === usuario?.almacenId);
        const almacenDestino = almacenes.find(a => a.id === parseInt(almacenDestinoId));
        if (almacenOrigen && almacenDestino && usuario) {
          generarPDFSalida({
            id: data.movimiento.id,
            estado: 'pendiente',
            fechaSolicitud: data.movimiento.fechaSolicitud || new Date().toISOString(),
            almacenOrigen: { id: almacenOrigen.id, nombre: almacenOrigen.nombre },
            almacenDestino: { id: almacenDestino.id, nombre: almacenDestino.nombre },
            usuarioSolicitante: { id: usuario.id, nombre: usuario.nombre },
            transportadoPor: transportadoPor || null,
            observaciones: observaciones || null,
            detalles: productosSeleccionados.map(p => ({
              codigo: p.producto.codigo,
              nombre: p.producto.nombre,
              tipo: p.producto.tipo,
              cantidad: p.cantidad,
              unidadMedida: p.producto.unidadMedida,
            })),
          });
        }
      } catch { }

      setMessage({ type: 'success', text: `Movimiento #${data.movimiento.id} creado exitosamente` });
      setAlmacenDestinoId('');
      setTransportadoPor('');
      setProductosSeleccionados([]);
      setObservaciones('');
      setTimeout(() => { onClose(); onSuccess?.(); }, 1500);
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error desconocido' });
    } finally {
      setLoading(false);
    }
  };

  const totalUnidades = productosSeleccionados.reduce((s, p) => s + p.cantidad, 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-lg flex flex-col max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header con gradiente */}
        <div className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Registrar Salida</h2>
              <p className="text-xs text-blue-200">Enviar productos a otro almacén</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {message && (
            <div className={`mb-4 p-3 rounded-xl flex items-center gap-2.5 text-sm font-medium ${message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
              {message.type === 'success' ? (
                <svg className="w-4 h-4 flex-shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} id="form-salida" className="space-y-5">

            {/* Almacén destino con buscador */}
            <div>
              <label className="field-label">
                Almacén de Destino <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={almacenDropRef}>
                {/* Input buscador */}
                <div
                  className={`input-field flex items-center gap-2 cursor-text transition-all ${showAlmacenDropdown ? 'ring-2 ring-blue-400 border-blue-400' : ''
                    }`}
                  onClick={() => { setShowAlmacenDropdown(true); setTimeout(() => almacenInputRef.current?.focus(), 0); }}
                >
                  {/* Ícono búsqueda */}
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
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
                      <svg className="w-2.5 h-2.5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {/* Indicador de selección */}
                  {almacenDestinoId && (
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Dropdown lista */}
                {showAlmacenDropdown && (() => {
                  const userAlmacenId = (session?.user as any)?.almacenId;
                  const opciones = almacenes
                    .filter(a => a.id !== userAlmacenId)
                    .filter(a =>
                      almacenBusqueda.trim() === '' ||
                      a.nombre.toLowerCase().includes(almacenBusqueda.toLowerCase())
                    );
                  return (
                    <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-52 overflow-auto">
                      {opciones.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-gray-400 text-center">Sin resultados para "{almacenBusqueda}"</p>
                      ) : (
                        opciones.map(a => (
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
                            {almacenDestinoId === String(a.id) && (
                              <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  );
                })()}
              </div>
              {/* Campo hidden para validación */}
              <input type="hidden" value={almacenDestinoId} required />
            </div>

            {/* Dos columnas: Transportado por + (placeholder) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">
                  Transportado por <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  type="text"
                  value={transportadoPor}
                  onChange={e => setTransportadoPor(e.target.value)}
                  placeholder="Nombre del transportista"
                  className="input-field"
                />
              </div>
              <div>
                <label className="field-label">
                  Observaciones <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="Notas adicionales"
                  className="input-field"
                />
              </div>
            </div>

            {/* Productos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <label className="field-label mb-0">Productos</label>
                  {productosSeleccionados.length > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--primary-mid)', color: 'var(--primary)' }}>
                      {productosSeleccionados.length} ítem{productosSeleccionados.length > 1 ? 's' : ''} · {totalUnidades} uds
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowProductoModal(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors"
                  style={{ background: '#10B981' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#059669')}
                  onMouseOut={e => (e.currentTarget.style.background = '#10B981')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar
                </button>
              </div>

              {productosSeleccionados.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setShowProductoModal(true)}
                  className="w-full py-8 rounded-xl border-2 border-dashed text-center transition-colors group"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.background = '#f0fdf4'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)'; }}
                >
                  <svg className="mx-auto h-8 w-8 mb-2" style={{ color: 'var(--text-4)' }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>Toca para agregar productos</p>
                </button>
              ) : (
                <div className="space-y-2">
                  {productosSeleccionados.map(item => (
                    <div key={item.productoId}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 border"
                      style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                      <span className="text-lg flex-shrink-0">{TIPO_EMOJI[item.producto.tipo] || '📦'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{item.producto.nombre}</p>
                        <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-4)' }}>{item.producto.codigo}</p>
                      </div>
                      {/* Stepper */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button type="button"
                          onClick={() => actualizarCantidad(item.productoId, item.cantidad - 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold transition-colors"
                          style={{ background: 'var(--border)', color: 'var(--text-2)' }}>
                          −
                        </button>
                        <span className="w-9 text-center text-sm font-bold" style={{ color: 'var(--text-1)' }}>{item.cantidad}</span>
                        <button type="button"
                          onClick={() => actualizarCantidad(item.productoId, item.cantidad + 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold transition-colors text-white"
                          style={{ background: 'var(--primary)' }}>
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => eliminarProducto(item.productoId)}
                        className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                        style={{ color: 'var(--text-4)' }}
                        onMouseOver={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
                        onMouseOut={e => { e.currentTarget.style.color = 'var(--text-4)'; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3 flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors"
            style={{ background: 'var(--bg)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-salida"
            disabled={loading || productosSeleccionados.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%)' }}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Procesando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Registrar Salida
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-modal: Agregar Producto */}
      {showProductoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowProductoModal(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            {/* Sub-header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary-mid)' }}>
                  <svg className="w-4 h-4" style={{ color: 'var(--primary)' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Agregar Producto</h3>
              </div>
              <button
                onClick={() => setShowProductoModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-4)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="field-label">Producto</label>
                <select
                  value={productoActual}
                  onChange={e => setProductoActual(e.target.value)}
                  className="input-field"
                >
                  <option value="">Seleccionar producto...</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>
                      {TIPO_EMOJI[p.tipo] || '📦'} {p.nombre} ({p.codigo})
                    </option>
                  ))}
                </select>

                {productoActual && (
                  <div className="mt-2 px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
                    style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-mid)' }}>
                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span style={{ color: 'var(--text-2)' }}>
                      Stock disponible:{' '}
                      {stockDisponible === null ? (
                        <span style={{ color: 'var(--text-4)' }}>Cargando...</span>
                      ) : stockDisponible === 0 ? (
                        <span className="font-bold text-red-600">Sin stock</span>
                      ) : (
                        <span className="font-bold" style={{ color: '#10B981' }}>{stockDisponible} uds</span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="field-label">Cantidad</label>
                <div className="flex items-center gap-3">
                  <button type="button"
                    onClick={() => setCantidadActual(v => String(Math.max(0, parseInt(v || '0') - 1)))}
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0 transition-colors"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                    −
                  </button>
                  <input
                    type="number"
                    value={cantidadActual}
                    onChange={e => setCantidadActual(e.target.value)}
                    min="1"
                    placeholder="0"
                    className="input-field text-center text-xl font-bold flex-1"
                    onKeyDown={e => e.key === 'Enter' && agregarProducto()}
                  />
                  <button type="button"
                    onClick={() => setCantidadActual(v => String(parseInt(v || '0') + 1))}
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0 text-white transition-colors"
                    style={{ background: 'var(--primary)' }}>
                    +
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowProductoModal(false)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors"
                  style={{ background: 'var(--bg)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={agregarProducto}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-colors"
                  style={{ background: '#10B981' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#059669')}
                  onMouseOut={e => (e.currentTarget.style.background = '#10B981')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
