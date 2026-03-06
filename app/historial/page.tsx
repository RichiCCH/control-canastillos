'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/navigation';
import * as XLSX from 'xlsx';
import { generarPDFSalida, generarPDFRecepcion } from '@/lib/utils/pdf';
import {
  Filter, X, Download, FileText, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Search, Warehouse,
} from 'lucide-react';
import AlmacenMultiSelect from '@/components/almacen-multi-select';

interface Movimiento {
  id: number;
  estado: string;
  observaciones: string | null;
  transportadoPor: string | null;
  fechaSolicitud: string;
  fechaAprobacion: string | null;
  tipo: 'entrada' | 'salida' | 'ajuste_entrada' | 'ajuste_baja';
  almacenOrigen: { id: number; nombre: string } | null;
  almacenDestino: { id: number; nombre: string } | null;
  usuarioSolicitante: { id: number; nombre: string } | null;
  usuarioAprobador: { id: number; nombre: string } | null;
  detalles: Array<{
    id: number; cantidad: number;
    producto: { id: number; codigo: string; nombre: string; tipo: string; unidadMedida: string };
  }>;
}

type SortField = 'id' | 'fecha' | 'estado' | 'tipo' | 'almacen';
type SortDir = 'asc' | 'desc';

const TIPO_EMOJI: Record<string, string> = {
  canastillo_negro: '⬛', canastillo_color: '🎨', cooler: '❄️', caja: '📦',
};

const ESTADO_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pendiente: { bg: '#fffbeb', color: '#b45309', label: 'Pendiente' },
  aprobado: { bg: '#f0fdf4', color: '#166534', label: 'Aprobado' },
  rechazado: { bg: '#fff1f2', color: '#be123c', label: 'Rechazado' },
  anulado: { bg: '#f9fafb', color: '#6b7280', label: 'Anulado' },
};

export default function HistorialPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Forzar refresh del JWT al montar para cargar rol y almacenes actualizados
  useEffect(() => { update(); }, []);
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  // Datos del usuario
  const rol = (session?.user as any)?.rol || 'operador';
  const almacenIdSesion = (session?.user as any)?.almacenId as number | null;
  const almacenNombreSesion = (session?.user as any)?.almacenNombre as string | null;
  const almacenesUsuarioRaw: { id: number; nombre: string; esPrincipal: boolean }[] =
    (session?.user as any)?.almacenes || [];
  // Si el JWT aún no tiene almacenes cargados pero sí almacenId, usarlo como fallback
  const almacenesUsuario = almacenesUsuarioRaw.length > 0
    ? almacenesUsuarioRaw
    : (almacenIdSesion ? [{ id: almacenIdSesion, nombre: almacenNombreSesion || '', esPrincipal: true }] : []);
  const isEncargado = rol === 'encargado';
  const isAdmin = rol === 'admin';

  // ── Filtros ──
  const [fEstado, setFEstado] = useState('todos');
  const [fTipo, setFTipo] = useState('todos');
  const [fBusqueda, setFBusqueda] = useState('');
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [fAlmacen, setFAlmacen] = useState<number[]>([]); // [] = todos

  // ── Orden ──
  const [sortField, setSortField] = useState<SortField>('fecha');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // ── Expandido ──
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { router.push('/login'); return; }
    if (!session?.user) return;

    const aid = (session.user as any).almacenId;

    if (isEncargado && almacenesUsuario.length > 0) {
      // Encargado: pide historial de TODOS sus almacenes asignados
      const ids = almacenesUsuario.map(a => a.id).join(',');
      fetch(`/api/historial?almacenes=${ids}`)
        .then(r => r.json())
        .then(data => setMovimientos(Array.isArray(data) ? data : []))
        .catch(() => { })
        .finally(() => setLoading(false));
    } else if (aid) {
      fetch(`/api/historial?almacenId=${aid}`)
        .then(r => r.json())
        .then(data => setMovimientos(Array.isArray(data) ? data : []))
        .catch(() => { })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session, status, router]);


  // ── Filtrado ──
  const filtered = useMemo(() => {
    let result = [...movimientos];

    if (fEstado !== 'todos') result = result.filter(m => m.estado === fEstado);
    if (fTipo !== 'todos') result = result.filter(m => m.tipo === fTipo);

    // Filtro por almacén (útil para el encargado con múltiples almacenes)
    if (fAlmacen.length > 0) {
      result = result.filter(m =>
        (m.almacenOrigen?.id !== undefined && fAlmacen.includes(m.almacenOrigen.id)) ||
        (m.almacenDestino?.id !== undefined && fAlmacen.includes(m.almacenDestino.id))
      );
    }

    if (fBusqueda.trim()) {
      const q = fBusqueda.trim().toLowerCase();
      result = result.filter(m =>
        String(m.id).includes(q) ||
        m.almacenOrigen?.nombre.toLowerCase().includes(q) ||
        m.almacenDestino?.nombre.toLowerCase().includes(q) ||
        m.usuarioSolicitante?.nombre.toLowerCase().includes(q) ||
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

    // ── Ordenar ──
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'id') cmp = a.id - b.id;
      if (sortField === 'fecha') cmp = new Date(a.fechaSolicitud).getTime() - new Date(b.fechaSolicitud).getTime();
      if (sortField === 'estado') cmp = a.estado.localeCompare(b.estado);
      if (sortField === 'tipo') cmp = a.tipo.localeCompare(b.tipo);
      if (sortField === 'almacen') {
        const aName = a.almacenOrigen?.nombre || a.almacenDestino?.nombre || '';
        const bName = b.almacenOrigen?.nombre || b.almacenDestino?.nombre || '';
        cmp = aName.localeCompare(bName);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [movimientos, fEstado, fTipo, fAlmacen, fBusqueda, fDesde, fHasta, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-30" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
      : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />;
  };

  const resetFiltros = () => {
    setFEstado('todos'); setFTipo('todos'); setFBusqueda(''); setFDesde(''); setFHasta(''); setFAlmacen([]);
    setPage(1);
  };

  const activeFilters = [fEstado !== 'todos', fTipo !== 'todos', fAlmacen.length > 0, !!fBusqueda.trim(), !!fDesde, !!fHasta].filter(Boolean).length;

  const formatDate = (s: string) => new Date(s).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  // ── Estadísticas rapidas ──
  const stats = useMemo(() => ({
    total: movimientos.length,
    aprobados: movimientos.filter(m => m.estado === 'aprobado').length,
    pendientes: movimientos.filter(m => m.estado === 'pendiente').length,
    rechazados: movimientos.filter(m => m.estado === 'rechazado').length,
  }), [movimientos]);

  // ── Export Excel ──
  const exportExcel = () => {
    const rows = filtered.flatMap(m =>
      m.detalles.length ? m.detalles.map(d => ({
        'ID': m.id, 'Estado': ESTADO_STYLE[m.estado]?.label || m.estado,
        'Tipo': m.tipo,
        'Almacén Origen': m.almacenOrigen?.nombre || '',
        'Almacén Destino': m.almacenDestino?.nombre || '',
        'Solicitante': m.usuarioSolicitante?.nombre || '', 'Aprobador': m.usuarioAprobador?.nombre || '',
        'Fecha Solicitud': formatDate(m.fechaSolicitud),
        'Fecha Aprobación': m.fechaAprobacion ? formatDate(m.fechaAprobacion) : '',
        'Producto': d.producto.nombre, 'Código': d.producto.codigo,
        'Cantidad': d.cantidad, 'Unidad': d.producto.unidadMedida,
        'Observaciones': m.observaciones || '',
      })) : [{ 'ID': m.id, 'Estado': ESTADO_STYLE[m.estado]?.label || m.estado, 'Tipo': m.tipo }]
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial');
    XLSX.writeFile(wb, `historial_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const pdfSalida = (m: Movimiento) => generarPDFSalida({
    id: m.id, estado: m.estado, fechaSolicitud: m.fechaSolicitud, fechaAprobacion: m.fechaAprobacion || undefined,
    almacenOrigen: m.almacenOrigen || { id: 0, nombre: 'N/A' },
    almacenDestino: m.almacenDestino || { id: 0, nombre: 'N/A' },
    usuarioSolicitante: m.usuarioSolicitante || { id: 0, nombre: 'N/A' },
    usuarioAprobador: m.usuarioAprobador || undefined,
    transportadoPor: m.transportadoPor || undefined,
    observaciones: m.observaciones || undefined,
    detalles: m.detalles.map(d => ({ ...d.producto, cantidad: d.cantidad, unidadMedida: d.producto.unidadMedida })),
  });

  const pdfRecepcion = (m: Movimiento) => generarPDFRecepcion({
    id: m.id, estado: m.estado, fechaSolicitud: m.fechaSolicitud, fechaAprobacion: m.fechaAprobacion || undefined,
    almacenOrigen: m.almacenOrigen || { id: 0, nombre: 'N/A' },
    almacenDestino: m.almacenDestino || { id: 0, nombre: 'N/A' },
    usuarioSolicitante: m.usuarioSolicitante || { id: 0, nombre: 'N/A' },
    usuarioAprobador: m.usuarioAprobador || undefined,
    observaciones: m.observaciones || undefined,
    detalles: m.detalles.map(d => ({ ...d.producto, cantidad: d.cantidad, unidadMedida: d.producto.unidadMedida })),
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="main-content">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-6 lg:pt-8 space-y-4 pb-8">

          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold lg:text-3xl text-gray-900">Historial de Movimientos</h1>
              <p className="text-sm mt-1 text-muted-foreground">
                {isEncargado && almacenesUsuario.length > 1 && (
                  <span className="text-purple-600 font-semibold mr-2">
                    🏢 {almacenesUsuario.length} almacenes ·
                  </span>
                )}
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                {activeFilters > 0 && <span className="ml-1 text-blue-600">(filtrando)</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportExcel}
                disabled={filtered.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
                style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
              >
                <Download className="w-4 h-4" /> Excel
              </button>
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
          </div>

          {/* ── Stats rápidas ── */}
          {!loading && (
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
            <div className="card-elevated p-4 space-y-3 animate-fade-in">
              {/* Búsqueda rápida */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text" value={fBusqueda} onChange={e => { setFBusqueda(e.target.value); setPage(1); }}
                  placeholder="Buscar por #ID, almacén, usuario o producto..."
                  className="input-field pl-9"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {/* Filtro Almacén: para encargado con múltiples almacenes */}
                {isEncargado && almacenesUsuario.length > 1 && (
                  <div className="col-span-2 sm:col-span-1">
                    <label className="field-label flex items-center gap-1"><Warehouse className="w-3 h-3" /> Almacén</label>
                    <AlmacenMultiSelect
                      almacenes={almacenesUsuario}
                      selected={fAlmacen}
                      onChange={(ids) => { setFAlmacen(ids); setPage(1); }}
                      placeholder="Todos los almacenes"
                    />
                  </div>
                )}
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
                  <label className="field-label">Tipo</label>
                  <select value={fTipo} onChange={e => { setFTipo(e.target.value); setPage(1); }} className="input-field">
                    <option value="todos">Todos</option>
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
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
                <span className="text-sm text-gray-400">Cargando historial...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                <p className="font-semibold text-gray-600">Sin movimientos</p>
                <p className="text-sm text-gray-400 mt-1">Prueba cambiando los filtros</p>
              </div>
            ) : (
              <>
                {/* ─ Tabla Desktop ─ */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80">
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-12">
                          <button onClick={() => toggleSort('id')} className="flex items-center gap-1 hover:text-gray-700">
                            #ID <SortIcon field="id" />
                          </button>
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">
                          <button onClick={() => toggleSort('fecha')} className="flex items-center gap-1 hover:text-gray-700">
                            Fecha <SortIcon field="fecha" />
                          </button>
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">
                          <button onClick={() => toggleSort('estado')} className="flex items-center gap-1 hover:text-gray-700">
                            Estado <SortIcon field="estado" />
                          </button>
                        </th>
                        {/* Columna Almacén visible para encargado */}
                        {isEncargado && (
                          <th className="text-left px-4 py-3 font-semibold text-purple-500 text-xs uppercase tracking-wide">
                            <button onClick={() => toggleSort('almacen')} className="flex items-center gap-1 hover:text-purple-700">
                              <Warehouse className="w-3 h-3" /> Almacén <SortIcon field="almacen" />
                            </button>
                          </th>
                        )}
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">
                          Origen → Destino
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Productos</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Solicitante</th>
                        <th className="px-4 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map((m) => {
                        const es = ESTADO_STYLE[m.estado] || { bg: '#f3f4f6', color: '#374151', label: m.estado };
                        const isExp = expanded === m.id;
                        // Para encargado: determinar almacén focal y dirección
                        const esOrigenDelEncargado = isEncargado && almacenesUsuario.some(a => a.id === m.almacenOrigen?.id);
                        const esDestinoDelEncargado = isEncargado && almacenesUsuario.some(a => a.id === m.almacenDestino?.id);
                        const almacenFocal = isEncargado
                          ? (esOrigenDelEncargado ? m.almacenOrigen : m.almacenDestino)
                          : null;
                        // dirección desde perspectiva del encargado
                        const dirEncargado = esOrigenDelEncargado && esDestinoDelEncargado
                          ? 'interno' // movimiento entre dos almacenes propios
                          : esOrigenDelEncargado ? 'salida' : 'entrada';

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
                              {/* Columna Almacén para encargado */}
                              {isEncargado && (
                                <td className="px-4 py-3">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-semibold text-gray-700">{almacenFocal?.nombre || '—'}</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit ${
                                      dirEncargado === 'salida'
                                        ? 'bg-orange-50 text-orange-600 border border-orange-200'
                                        : dirEncargado === 'entrada'
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                        : 'bg-blue-50 text-blue-600 border border-blue-200'
                                    }`}>
                                      {dirEncargado === 'salida' ? '↑ Salida' : dirEncargado === 'entrada' ? '↓ Entrada' : '↔ Interno'}
                                    </span>
                                  </div>
                                </td>
                              )}
                              <td className="px-4 py-3 text-xs text-gray-600 max-w-[180px]">
                                <span className="truncate block">{m.almacenOrigen?.nombre || '—'}</span>
                                <span className="text-gray-400">→ {m.almacenDestino?.nombre || '—'}</span>
                              </td>
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
                              <td className="px-4 py-3 text-xs text-gray-600">{m.usuarioSolicitante?.nombre || '—'}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => pdfSalida(m)} title="PDF Salida"
                                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                                    <FileText className="w-3.5 h-3.5" />
                                  </button>
                                  {m.estado === 'aprobado' && (
                                    <button onClick={() => pdfRecepcion(m)} title="PDF Recepción"
                                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 transition-colors">
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {/* Fila expandida */}
                            {isExp && (
                              <tr key={`exp-${m.id}`} className="bg-blue-50/20">
                                <td colSpan={isEncargado ? 8 : 7} className="px-6 py-3 border-b border-blue-100">
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
                                      <p>Origen: <span className="font-semibold text-gray-700">{m.almacenOrigen?.nombre || '—'}</span></p>
                                      <p>Destino: <span className="font-semibold text-gray-700">{m.almacenDestino?.nombre || '—'}</span></p>
                                      {m.usuarioAprobador && <p>Aprobado por: <span className="font-semibold text-gray-700">{m.usuarioAprobador.nombre}</span></p>}
                                      {m.transportadoPor && <p>Transportista: <span className="font-semibold text-gray-700">{m.transportadoPor}</span></p>}
                                      {m.observaciones && <p>Obs.: <span className="italic text-gray-600">{m.observaciones}</span></p>}
                                      {m.fechaAprobacion && <p>Aprobado: <span className="font-semibold text-gray-700">{formatDate(m.fechaAprobacion)}</span></p>}
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

                {/* ─ Cards Mobile ─ */}
                <div className="sm:hidden divide-y divide-gray-50">
                  {paged.map(m => {
                    const es = ESTADO_STYLE[m.estado] || { bg: '#f3f4f6', color: '#374151', label: m.estado };
                    const isExp = expanded === m.id;
                    const esOrigenMob = isEncargado && almacenesUsuario.some(a => a.id === m.almacenOrigen?.id);
                    const esDestinoMob = isEncargado && almacenesUsuario.some(a => a.id === m.almacenDestino?.id);
                    const almacenFocal = isEncargado ? (esOrigenMob ? m.almacenOrigen : m.almacenDestino) : null;
                    const dirMob = esOrigenMob && esDestinoMob ? 'interno' : esOrigenMob ? 'salida' : 'entrada';
                    return (
                      <div key={m.id} className={`p-4 ${isExp ? 'bg-blue-50/20' : ''}`} onClick={() => setExpanded(isExp ? null : m.id)}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">#{m.id}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: es.bg, color: es.color }}>{es.label}</span>
                            {isEncargado && almacenFocal && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                dirMob === 'salida' ? 'bg-orange-50 text-orange-600 border-orange-200'
                                : dirMob === 'entrada' ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-blue-50 text-blue-600 border-blue-200'
                              }`}>
                                {dirMob === 'salida' ? '↑' : dirMob === 'entrada' ? '↓' : '↔'} {almacenFocal.nombre}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">{formatDate(m.fechaSolicitud)}</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {m.almacenOrigen?.nombre || '—'} → {m.almacenDestino?.nombre || '—'}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {m.detalles.map(d => (
                            <span key={d.id} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              {TIPO_EMOJI[d.producto.tipo]} {d.producto.nombre} × {d.cantidad}
                            </span>
                          ))}
                        </div>
                        {isExp && (
                          <div className="mt-3 flex gap-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => pdfSalida(m)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700">
                              <FileText className="w-3.5 h-3.5" /> PDF Salida
                            </button>
                            {m.estado === 'aprobado' && (
                              <button onClick={() => pdfRecepcion(m)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700">
                                <FileText className="w-3.5 h-3.5" /> PDF Recepción
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ─ Paginación ─ */}
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
    </div>
  );
}
