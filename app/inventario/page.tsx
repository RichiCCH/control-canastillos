'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/navigation';
import { useSession } from 'next-auth/react';

interface Almacen { id: number; nombre: string; ubicacion: string | null; }
interface InventarioItem {
  id: number; cantidad: number;
  producto: { id: number; codigo: string; nombre: string; tipo: string; unidadMedida: string; };
}

const TIPO_EMOJI: Record<string, string> = {
  canastillo_negro: '⬛', canastillo_color: '🎨', cooler: '❄️', caja: '📦',
};

const STOCK_MAX: Record<string, number> = {
  canastillo_negro: 500, canastillo_color: 400, cooler: 200, caja: 600,
};

export default function InventarioPage() {
  const { data: session } = useSession();
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [almacenSeleccionado, setAlmacenSeleccionado] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Almacenes que el usuario tiene asignados (vacío = admin, ve todos)
  const almacenesUsuario: { id: number; nombre: string; esPrincipal: boolean }[] =
    (session?.user as any)?.almacenes || [];

  useEffect(() => {
    fetchAlmacenes();
  }, []);

  // Pre-seleccionar almacén al cargar la sesión y los almacenes
  useEffect(() => {
    if (almacenes.length === 0) return;
    const lista = almacenesUsuario.length > 0
      ? almacenes.filter(a => almacenesUsuario.some(u => u.id === a.id))
      : almacenes; // admin ve todos
    if (lista.length === 0) return;
    // Pre-seleccionar el principal, o el único si solo hay uno
    const principal = almacenesUsuario.find(u => u.esPrincipal);
    const preselect = principal
      ? String(principal.id)
      : String(lista[0].id);
    setAlmacenSeleccionado(preselect);
  }, [session, almacenes]);

  useEffect(() => {
    if (almacenSeleccionado) fetchInventario(parseInt(almacenSeleccionado));
  }, [almacenSeleccionado]);

  const fetchAlmacenes = async () => {
    try { const r = await fetch('/api/almacenes'); setAlmacenes(await r.json()); } catch { }
  };
  const fetchInventario = async (id: number) => {
    setLoading(true);
    try { const r = await fetch(`/api/inventario?almacenId=${id}`); setInventario(await r.json()); } catch { } finally { setLoading(false); }
  };

  const inventarioFiltrado = inventario.filter(item => {
    if (estadoFiltro === 'con_stock' && item.cantidad === 0) return false;
    if (estadoFiltro === 'sin_stock' && item.cantidad > 0) return false;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      return item.producto.nombre.toLowerCase().includes(q) || item.producto.codigo.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navigation />
      <div className="main-content">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold lg:text-3xl text-gray-900">Inventario</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Stock disponible por almacén</p>
            </div>
            {/* Solo mostrar selector si hay más de 1 almacén disponible */}
            {(() => {
              const lista = almacenesUsuario.length > 0
                ? almacenes.filter(a => almacenesUsuario.some(u => u.id === a.id))
                : almacenes;
              if (lista.length <= 1) return null;
              return (
                <select
                  value={almacenSeleccionado}
                  onChange={e => { setAlmacenSeleccionado(e.target.value); setBusqueda(''); }}
                  className="input-field sm:w-52"
                >
                  {lista.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              );
            })()}
          </div>

          {/* Filters */}
          {almacenSeleccionado && (
            <div className="card-elevated p-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-4)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o código..."
                  className="input-field pl-9"
                />
              </div>
              <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} className="input-field sm:w-44">
                <option value="todos">Todos</option>
                <option value="con_stock">Con stock</option>
                <option value="sin_stock">Sin stock</option>
              </select>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="card-elevated py-12 flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary)' }} />
              <span style={{ color: 'var(--text-3)' }}>Cargando inventario...</span>
            </div>
          ) : !almacenSeleccionado ? (
            <div className="card-elevated py-12 text-center">
              <svg className="mx-auto h-14 w-14 mb-3" style={{ color: 'var(--text-4)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p style={{ color: 'var(--text-3)' }}>Selecciona un almacén para ver su inventario</p>
            </div>
          ) : inventario.length === 0 ? (
            <div className="card-elevated py-12 text-center">
              <svg className="mx-auto h-14 w-14 mb-3" style={{ color: 'var(--text-4)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5" />
              </svg>
              <p style={{ color: 'var(--text-3)' }}>No hay productos en este almacén</p>
            </div>
          ) : inventarioFiltrado.length === 0 ? (
            <div className="card-elevated py-10 text-center">
              <p style={{ color: 'var(--text-3)' }}>No hay productos que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {inventarioFiltrado.map(item => {
                const max = STOCK_MAX[item.producto.tipo] || 500;
                const pct = Math.min(Math.round((item.cantidad / max) * 100), 100);
                const emoji = TIPO_EMOJI[item.producto.tipo] || '📦';
                return (
                  <div key={item.id} className="card-elevated p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">
                          {emoji} {item.producto.nombre}
                        </p>
                        <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-4)' }}>{item.producto.codigo}</p>
                      </div>
                      <p className="text-2xl font-bold ml-3 flex-shrink-0 font-sans">
                        {item.cantidad}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: pct > 60 ? '#10b981' : pct > 25 ? '#f59e0b' : '#f43f5e',
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px]" style={{ color: 'var(--text-4)' }}>{item.producto.unidadMedida}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-4)' }}>{pct}% de capacidad</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary */}
          {inventario.length > 0 && (
            <p className="text-xs text-center pb-2" style={{ color: 'var(--text-4)' }}>
              {inventarioFiltrado.length} de {inventario.length} productos · {inventario.reduce((s, i) => s + i.cantidad, 0).toLocaleString()} unidades totales
            </p>
          )}

        </div>
      </div>
    </div>
  );
}
