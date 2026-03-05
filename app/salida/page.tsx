'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/navigation';
import { generarPDFSalida } from '@/lib/utils/pdf';

interface Almacen { id: number; nombre: string; }
interface Producto { id: number; codigo: string; nombre: string; tipo: string; unidadMedida: string; }
interface ProductoSel { productoId: number; producto: Producto; cantidad: number; }

export default function SalidaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [almacenDestinoId, setAlmacenDestinoId] = useState('');
  const [transportadoPor, setTransportadoPor] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [seleccionados, setSeleccionados] = useState<ProductoSel[]>([]);
  const [productoActual, setProductoActual] = useState('');
  const [cantidadActual, setCantidadActual] = useState('');
  const [stock, setStock] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [modal, setModal] = useState(false);

  useEffect(() => { if (status === 'unauthenticated') router.push('/login'); }, [status, router]);
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/almacenes').then(r => r.json()).then(setAlmacenes).catch(() => { });
    fetch('/api/productos').then(r => r.json()).then(setProductos).catch(() => { });
  }, [status]);

  useEffect(() => {
    if (!productoActual) { setStock(null); return; }
    const aid = (session?.user as any)?.almacenId;
    if (!aid) return;
    fetch(`/api/inventario?almacenId=${aid}&productoId=${productoActual}`)
      .then(r => r.json())
      .then(d => setStock(d.length > 0 ? d[0].cantidad : 0))
      .catch(() => setStock(null));
  }, [productoActual, session]);

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
    if (!almacenDestinoId) { setMsg({ ok: false, text: 'Selecciona un almacén de destino.' }); return; }
    if (!seleccionados.length) { setMsg({ ok: false, text: 'Agrega al menos un producto.' }); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      const origen = almacenes.find(a => a.id === usuario?.almacenId);
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
      setAlmacenDestinoId(''); setTransportadoPor(''); setObservaciones(''); setSeleccionados([]);
    } catch (err: any) {
      setMsg({ ok: false, text: err.message || 'Error desconocido.' });
    } finally { setLoading(false); }
  };

  const totalUds = seleccionados.reduce((s, p) => s + p.cantidad, 0);

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
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Destino */}
          <div className="card-elevated p-4 space-y-4">
            <h2 className="text-base font-semibold text-gray-800 font-display">Información de Envío</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  Almacén Destino <span className="text-red-500">*</span>
                </label>
                <select value={almacenDestinoId} onChange={e => setAlmacenDestinoId(e.target.value)} className="input-field" required>
                  <option value="">Seleccionar...</option>
                  {almacenes.filter(a => a.id !== (session?.user as any)?.almacenId).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
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
          <div className="card-elevated p-4">
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
                <svg className="h-10 w-10 mb-2" style={{ color: 'var(--text-4)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <p className="text-sm" style={{ color: 'var(--text-4)' }}>Toca para agregar productos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {seleccionados.map(item => (
                  <div key={item.productoId} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border" style={{ background: '#f9fafb', borderColor: 'var(--border)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.producto.nombre}</p>
                      <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-4)' }}>{item.producto.codigo}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button type="button" onClick={() => cambiarCant(item.productoId, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border text-gray-500 hover:bg-gray-100 transition-colors text-base"
                        style={{ borderColor: 'var(--border)' }}>−</button>
                      <span className="w-8 text-center text-sm font-bold text-gray-900 tabular-nums">{item.cantidad}</span>
                      <button type="button" onClick={() => cambiarCant(item.productoId, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border text-gray-500 hover:bg-gray-100 transition-colors text-base"
                        style={{ borderColor: 'var(--border)' }}>+</button>
                    </div>
                    <button type="button" onClick={() => quitar(item.productoId)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading || !seleccionados.length}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--primary)' }}>
            {loading ? (
              <><div className="animate-spin h-4 w-4 rounded-full border-b-2 border-white" /> Procesando...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Producto</label>
                <select value={productoActual} onChange={e => setProductoActual(e.target.value)} className="input-field">
                  <option value="">Seleccionar producto...</option>
                  {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>)}
                </select>
                {productoActual && (
                  <div className="mt-2 px-3 py-2 rounded-lg flex items-center gap-2 text-sm" style={{ background: '#eff6ff', border: '1px solid #dbeafe' }}>
                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    <span style={{ color: '#1e40af' }}>Stock: {stock === null ? 'Cargando...' : stock === 0 ? <span className="text-red-600 font-bold">Sin stock</span> : <span className="text-green-700 font-bold">{stock} uds</span>}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">Cantidad</label>
                <input type="number" value={cantidadActual} onChange={e => setCantidadActual(e.target.value)}
                  min="1" placeholder="0" className="input-field text-center text-lg font-bold"
                  onKeyDown={e => e.key === 'Enter' && agregar()} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors">Cancelar</button>
                <button type="button" onClick={agregar}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-colors"
                  style={{ background: '#10b981' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
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
