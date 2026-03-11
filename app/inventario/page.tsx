'use client';

import { useState, useEffect, useMemo } from 'react';
import Navigation from '@/components/navigation';
import { useSession } from 'next-auth/react';
import { Warehouse, Search } from 'lucide-react';
import AlmacenMultiSelect from '@/components/almacen-multi-select';

interface Almacen { id: number; nombre: string; ubicacion: string | null; }
interface InventarioItem {
  id: number; cantidad: number;
  almacenId?: number;
  almacenNombre?: string;
  producto: { id: number; codigo: string; nombre: string; tipo: string; unidadMedida: string; };
}

const TIPO_EMOJI: Record<string, string> = {
  canastillo_negro: '⬛', canastillo_color: '🎨', cooler: '❄️', caja: '📦',
};

const STOCK_MAX: Record<string, number> = {
  canastillo_negro: 500, canastillo_color: 400, cooler: 200, caja: 600,
};

export default function InventarioPage() {
  const { data: session, update } = useSession();

  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [fAlmacenes, setFAlmacenes] = useState<number[]>([]); // [] = todos
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(false);

  const rol = (session?.user as any)?.rol || 'operador';
  const isAdmin = rol === 'admin';

  // Almacenes asignados al usuario — con fallback a almacenId si el JWT aún no tiene la lista
  const almacenIdSesion = (session?.user as any)?.almacenId as number | null;
  const almacenNombreSesion = (session?.user as any)?.almacenNombre as string | null;
  const almacenesUsuarioRaw: { id: number; nombre: string; esPrincipal: boolean }[] =
    (session?.user as any)?.almacenes || [];
  const almacenesUsuario = almacenesUsuarioRaw.length > 0
    ? almacenesUsuarioRaw
    : (almacenIdSesion ? [{ id: almacenIdSesion, nombre: almacenNombreSesion || '', esPrincipal: true }] : []);

  // Forzar refresh del JWT al montar
  useEffect(() => { update(); }, []);

  // Cargar lista de almacenes disponibles
  useEffect(() => {
    fetch('/api/almacenes')
      .then(r => r.json())
      .then(data => setAlmacenes(Array.isArray(data) ? data : []))
      .catch(() => { });
  }, []);

  // Lista de almacenes que el usuario puede ver
  const listaAlmacenes = useMemo(() => {
    if (isAdmin) return almacenes;
    if (almacenesUsuario.length > 0) {
      return almacenes.filter(a => almacenesUsuario.some(u => u.id === a.id));
    }
    const aid = (session?.user as any)?.almacenId;
    return almacenes.filter(a => a.id === aid);
  }, [almacenes, almacenesUsuario, isAdmin, session]);

  // Cargar inventario cuando cambia la selección de almacenes
  useEffect(() => {
    if (listaAlmacenes.length === 0) return;
    loadInventario();
  }, [fAlmacenes, listaAlmacenes]);

  const loadInventario = async () => {
    setLoading(true);
    try {
      // targets = almacenes seleccionados, o todos si ninguno seleccionado
      const targets = fAlmacenes.length > 0
        ? listaAlmacenes.filter(a => fAlmacenes.includes(a.id))
        : listaAlmacenes;

      const results = await Promise.all(
        targets.map(a =>
          fetch(`/api/inventario?almacenId=${a.id}`)
            .then(r => r.json())
            .then((items: InventarioItem[]) =>
              items.map(item => ({ ...item, almacenId: a.id, almacenNombre: a.nombre }))
            )
        )
      );
      setInventario(results.flat());
    } catch {
    } finally {
      setLoading(false);
    }
  };

  // Filtrado por búsqueda y stock
  const inventarioFiltrado = useMemo(() => {
    let items = [...inventario];
    if (estadoFiltro === 'con_stock') items = items.filter(i => i.cantidad > 0);
    if (estadoFiltro === 'sin_stock') items = items.filter(i => i.cantidad === 0);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      items = items.filter(i =>
        i.producto.nombre.toLowerCase().includes(q) ||
        i.producto.codigo.toLowerCase().includes(q) ||
        i.almacenNombre?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [inventario, estadoFiltro, busqueda]);

  const mostrarColumnaAlmacen = listaAlmacenes.length > 1;
  const totalUnidades = inventarioFiltrado.reduce((s, i) => s + i.cantidad, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="main-content">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 space-y-5 pb-8">

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold lg:text-3xl text-gray-900">Inventario</h1>
              <p className="text-sm mt-1 text-muted-foreground">
                {inventarioFiltrado.length} producto{inventarioFiltrado.length !== 1 ? 's' : ''}
                {mostrarColumnaAlmacen && ` · ${fAlmacenes.length > 0 ? fAlmacenes.length : listaAlmacenes.length} almacén${(fAlmacenes.length || listaAlmacenes.length) !== 1 ? 'es' : ''}`}
                {' · '}<span className="font-semibold text-blue-600">{totalUnidades.toLocaleString()} unidades</span>
              </p>
            </div>
          </div>

          {/* ── Barra de búsqueda + filtros ── */}
          <div className="card-elevated p-3 flex flex-col sm:flex-row gap-3 items-end">
            {/* Búsqueda */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, código o almacén..."
                className="input-field pl-9"
              />
            </div>

            {/* Multi-select almacén (solo si hay más de uno disponible) */}
            {listaAlmacenes.length > 1 && (
              <AlmacenMultiSelect
                almacenes={listaAlmacenes}
                selected={fAlmacenes}
                onChange={setFAlmacenes}
              />
            )}

            {/* Estado */}
            <div className="flex-shrink-0">
              <select value={estadoFiltro} onChange={e => setEstadoFiltro(e.target.value)} className="input-field sm:w-44">
                <option value="todos">Todos los productos</option>
                <option value="con_stock">Con stock</option>
                <option value="sin_stock">Sin stock</option>
              </select>
            </div>
          </div>

          {/* ── Tabla de inventario (desktop) / Cards (mobile) ── */}
          {loading ? (
            <div className="card-elevated py-14 flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
              <span className="text-muted-foreground text-sm">Cargando inventario...</span>
            </div>
          ) : inventarioFiltrado.length === 0 ? (
            <div className="card-elevated py-14 text-center">
              <p className="font-medium text-muted-foreground">No hay productos que coincidan</p>
              <p className="text-sm text-gray-400 mt-1">Intenta cambiar los filtros</p>
            </div>
          ) : (
            <>
              {/* ── Vista mobile: cards ── */}
              <div className="sm:hidden space-y-2">
                {inventarioFiltrado.map((item) => {
                  const max = STOCK_MAX[item.producto.tipo] || 500;
                  const pct = Math.min(Math.round((item.cantidad / max) * 100), 100);
                  const emoji = TIPO_EMOJI[item.producto.tipo] || '📦';
                  const barColor = item.cantidad === 0 ? '#f43f5e' : pct > 60 ? '#10b981' : '#f59e0b';
                  const stockColor = item.cantidad === 0 ? 'text-red-500' : pct > 60 ? 'text-emerald-600' : 'text-amber-600';
                  return (
                    <div key={`m-${item.almacenId}-${item.id}`} className="card-elevated p-4">
                      <div className="flex items-start justify-between gap-3">
                        {/* Info izquierda */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 leading-tight">
                            {emoji} {item.producto.nombre}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[11px] font-mono text-gray-400">{item.producto.codigo}</span>
                            <span className="text-[11px] text-gray-400 capitalize">{item.producto.tipo.replace('_', ' ')}</span>
                            {mostrarColumnaAlmacen && item.almacenNombre && (
                              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                                {item.almacenNombre}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Stock derecha */}
                        <div className="flex-shrink-0 text-right">
                          <p className={`text-2xl font-bold leading-none ${stockColor}`}>
                            {item.cantidad.toLocaleString()}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{item.producto.unidadMedida}</p>
                        </div>
                      </div>
                      {/* Barra de nivel */}
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%`, background: barColor }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-400 w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
                {/* Footer mobile */}
                <div className="text-center py-2">
                  <p className="text-xs text-gray-400">
                    {inventarioFiltrado.length} producto{inventarioFiltrado.length !== 1 ? 's' : ''} ·{' '}
                    <span className="font-semibold text-blue-600">{totalUnidades.toLocaleString()} unidades</span>
                  </p>
                </div>
              </div>

              {/* ── Vista desktop: tabla ── */}
              <div className="hidden sm:block card-elevated overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80">
                        {mostrarColumnaAlmacen && (
                          <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-purple-500">
                            <div className="flex items-center gap-1"><Warehouse className="w-3 h-3" /> Almacén</div>
                          </th>
                        )}
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Producto</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Código</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Stock</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-40">Nivel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {inventarioFiltrado.map((item) => {
                        const max = STOCK_MAX[item.producto.tipo] || 500;
                        const pct = Math.min(Math.round((item.cantidad / max) * 100), 100);
                        const emoji = TIPO_EMOJI[item.producto.tipo] || '📦';
                        const barColor = item.cantidad === 0 ? '#f43f5e' : pct > 60 ? '#10b981' : '#f59e0b';
                        return (
                          <tr key={`${item.almacenId}-${item.id}`} className="hover:bg-gray-50/60 transition-colors">
                            {mostrarColumnaAlmacen && (
                              <td className="px-4 py-3">
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100 whitespace-nowrap">
                                  {item.almacenNombre}
                                </span>
                              </td>
                            )}
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-800">{emoji} {item.producto.nombre}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-mono text-gray-400">{item.producto.codigo}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-gray-500 capitalize">{item.producto.tipo.replace('_', ' ')}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`text-base font-bold ${item.cantidad === 0 ? 'text-red-500' : 'text-gray-800'}`}>
                                {item.cantidad.toLocaleString()}
                              </span>
                              <span className="text-xs text-gray-400 ml-1">{item.producto.unidadMedida}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${pct}%`, background: barColor }}
                                  />
                                </div>
                                <span className="text-[10px] text-gray-400 w-8 text-right">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Footer de la tabla */}
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {inventarioFiltrado.length} producto{inventarioFiltrado.length !== 1 ? 's' : ''}
                      {busqueda || estadoFiltro !== 'todos' || fAlmacenes.length > 0 ? ' (filtrado)' : ''}
                    </p>
                    <p className="text-xs font-semibold text-gray-600">
                      Total: <span className="text-blue-600">{totalUnidades.toLocaleString()}</span> unidades
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
