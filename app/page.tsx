'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/navigation';
import { useSession } from 'next-auth/react';
import ModalSalida from '@/components/modal-salida';
import ModalRecepciones from '@/components/modal-recepciones';
import { Package, Boxes, Warehouse, Inbox, ArrowUpFromLine, Clock, ChevronRight } from 'lucide-react';

interface AdminStats {
  role: 'admin'; totalProductos: number; totalInventario: number; almacenes: number; movimientosPendientes: number;
}
interface EncargadoStats {
  role: 'encargado'; almacenesCount: number; movimientosPendientes: number; productosEnStock: number; pendingSent: number; pendingReceptions: number;
}
interface OperatorStats {
  role: 'operator'; pendingReceptions: number; productosEnStock: number; pendingSent: number;
}
type Stats = AdminStats | EncargadoStats | OperatorStats;


interface Movement {
  id: number;
  estado: string;
  fechaSolicitud: string;
  almacenOrigen: { nombre: string };
  almacenDestino: { nombre: string };
  detalles: { producto: { nombre: string; tipo: string }; cantidad: number }[];
}

const TIPO_EMOJI: Record<string, string> = {
  canastillo_negro: '⬛',
  canastillo_color: '🎨',
  cooler: '❄️',
  caja: '📦',
};

export default function Home() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModalSalida, setShowModalSalida] = useState(false);
  const [showModalRecepciones, setShowModalRecepciones] = useState(false);

  // Forzar refresh del JWT al montar para cargar rol y almacenes actualizados
  useEffect(() => { update(); }, []);

  const fetchStats = async () => {
    try {
      const rol = (session?.user as any)?.rol || 'operador';
      const aid = (session?.user as any)?.almacenId;
      const almacenes: { id: number }[] = (session?.user as any)?.almacenes || [];

      let sUrl: string;
      let mUrl: string | null = null;

      if (rol === 'admin') {
        sUrl = '/api/stats';
      } else if (rol === 'encargado' && almacenes.length > 0) {
        // Encargado: pasar lista de todos sus almacenes
        const ids = almacenes.map(a => a.id).join(',');
        sUrl = `/api/stats?almacenes=${ids}`;
        mUrl = `/api/historial?almacenes=${ids}`;
      } else {
        sUrl = aid ? `/api/stats?almacenId=${aid}` : '/api/stats';
        mUrl = aid ? `/api/historial?almacenId=${aid}` : null;
      }

      const fetches: Promise<Response>[] = [fetch(sUrl)];
      if (mUrl) fetches.push(fetch(mUrl));
      const [sr, mr] = await Promise.all(fetches);
      if (sr.ok) setStats(await sr.json());
      if (mr && mr.ok) {
        const all = await mr.json();
        setMovements(
          (Array.isArray(all) ? all : [])
            .sort((a: any, b: any) =>
              new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime()
            )
            .slice(0, 5)
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { router.push('/login'); return; }
    fetchStats();
  }, [session, status, router]);

  // Escuchar evento de notificaciones para abrir modal recepciones
  useEffect(() => {
    const handler = () => setShowModalRecepciones(true);
    window.addEventListener('open-recepciones', handler);
    return () => window.removeEventListener('open-recepciones', handler);
  }, []);

  const isAdmin = stats?.role === 'admin';
  const isEncargado = stats?.role === 'encargado';
  const almacenNombre = (session?.user as any)?.almacenNombre || '';

  const kpis = isAdmin ? [
    { label: 'Productos', value: (stats as AdminStats)?.totalProductos, iconClass: 'kpi-icon-blue', icon: Package },
    { label: 'Unidades', value: (stats as AdminStats)?.totalInventario, iconClass: 'kpi-icon-green', icon: Boxes },
    { label: 'Almacenes', value: (stats as AdminStats)?.almacenes, iconClass: 'kpi-icon-amber', icon: Warehouse },
    { label: 'Pendientes', value: (stats as AdminStats)?.movimientosPendientes, iconClass: 'kpi-icon-red', icon: Inbox },
  ] : isEncargado ? [
    { label: 'Mis Almacenes', value: (stats as any)?.almacenesCount, iconClass: 'kpi-icon-amber', icon: Warehouse },
    { label: 'Pendientes', value: (stats as any)?.movimientosPendientes, iconClass: 'kpi-icon-red', icon: Inbox },
    { label: 'En stock', value: (stats as any)?.productosEnStock, iconClass: 'kpi-icon-green', icon: Boxes },
    { label: 'Enviadas', value: (stats as any)?.pendingSent, iconClass: 'kpi-icon-blue', icon: ArrowUpFromLine },
  ] : [
    { label: 'Recepciones', value: (stats as OperatorStats)?.pendingReceptions, iconClass: 'kpi-icon-red', icon: Inbox },
    { label: 'En stock', value: (stats as OperatorStats)?.productosEnStock, iconClass: 'kpi-icon-green', icon: Boxes },
    { label: 'Enviadas', value: (stats as OperatorStats)?.pendingSent, iconClass: 'kpi-icon-blue', icon: ArrowUpFromLine },

  ];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return `Hoy, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    if (diff < 172800000) return 'Ayer';
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navigation />
      <div className="main-content">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl text-gray-900">
              {isAdmin ? 'Dashboard' : almacenNombre || 'Mi Almacén'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
              {isAdmin ? 'Control global del sistema de inventarios' : 'Stock disponible y movimientos de tu almacén'}
            </p>
          </div>

          {/* KPI Cards */}
          <div className={`grid gap-3 ${isAdmin
            ? 'grid-cols-2 lg:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-3'
            }`}>
            {loading
              ? Array.from({ length: isAdmin ? 4 : 3 }).map((_, i) => (
                <div key={i} className="card-elevated p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gray-200 animate-pulse flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-7 w-16 rounded-lg bg-gray-200 animate-pulse" />
                    <div className="h-2.5 w-20 rounded bg-gray-100 animate-pulse" />
                  </div>
                </div>
              ))
              : kpis.map(({ label, value, iconClass, icon: Icon }) => (
                <div key={label} className="card-elevated p-4 flex items-center gap-4 transition-transform hover:scale-[1.02]">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconClass} shadow-sm flex-shrink-0`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-3xl font-bold leading-none tracking-tight font-sans">
                      {(value ?? 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] mt-1.5 font-semibold uppercase tracking-wider text-muted-foreground">
                      {label}
                    </p>
                  </div>
                </div>
              ))
            }
          </div>


          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold mb-3 font-display">Acciones Rápidas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Registrar Salida */}
              <button onClick={() => setShowModalSalida(true)} className="card-elevated p-4 flex items-center gap-4 transition-all hover:shadow-md hover:scale-[1.01] w-full text-left group cursor-pointer">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm flex-shrink-0">
                  <ArrowUpFromLine className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Registrar Salida</p>
                  <p className="text-xs mt-0.5 text-muted-foreground">Enviar productos</p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Recepciones — abre modal */}
              <button
                onClick={() => setShowModalRecepciones(true)}
                className="card-elevated p-4 flex items-center gap-4 transition-all hover:shadow-md hover:scale-[1.01] w-full text-left group cursor-pointer"
              >
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm flex-shrink-0">
                  <Inbox className="h-5 w-5 text-white" />
                  {stats && (isAdmin ? (stats as AdminStats).movimientosPendientes : (stats as OperatorStats).pendingReceptions) > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-card">
                      {isAdmin ? (stats as AdminStats).movimientosPendientes : (stats as OperatorStats).pendingReceptions}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Recepciones</p>
                  <p className="text-xs mt-0.5 text-muted-foreground">
                    {loading ? '...' : `${isAdmin ? (stats as AdminStats).movimientosPendientes : (stats as OperatorStats).pendingReceptions} pendientes`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Inventario */}
              <a href="/inventario" className="card-elevated p-4 flex items-center gap-4 transition-all hover:shadow-md hover:scale-[1.01] group">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm flex-shrink-0">
                  <Boxes className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Inventario</p>
                  <p className="text-xs mt-0.5 text-muted-foreground">Consultar stock</p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>

          {/* Recent Movements */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold font-display">Movimientos Recientes</h2>
              <a href="/historial" className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--primary)' }}>
                Ver todos
                <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="card-elevated overflow-hidden">
              {loading ? (
                <div className="py-10 text-center text-sm text-muted-foreground">Cargando...</div>
              ) : movements.length === 0 ? (
                <div className="py-10 text-center">
                  <Clock className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-muted-foreground">Sin movimientos recientes</p>
                </div>
              ) : (
                <>
                  {/* Tabla desktop */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/80">
                          <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 w-12">#</th>
                          <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Estado</th>
                          <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Origen → Destino</th>
                          <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Productos</th>
                          <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...movements]
                          .sort((a, b) => new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime())
                          .slice(0, 5)
                          .map((m, idx) => {
                            const ESTADO_S: Record<string, { bg: string; color: string; label: string }> = {
                              pendiente: { bg: '#fffbeb', color: '#b45309', label: 'Pendiente' },
                              aprobado: { bg: '#f0fdf4', color: '#166534', label: 'Aprobado' },
                              rechazado: { bg: '#fff1f2', color: '#be123c', label: 'Rechazado' },
                              anulado: { bg: '#f9fafb', color: '#6b7280', label: 'Anulado' },
                            };
                            const es = ESTADO_S[m.estado] || { bg: '#f3f4f6', color: '#374151', label: m.estado };
                            return (
                              <tr
                                key={m.id}
                                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors cursor-pointer"
                                onClick={() => window.location.href = '/historial'}
                              >
                                <td className="px-4 py-3">
                                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">#{m.id}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: es.bg, color: es.color }}>
                                    {es.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px]">
                                  <span className="truncate block">{(m as any).almacenOrigen?.nombre ?? '—'}</span>
                                  <span className="text-gray-400">→ {(m as any).almacenDestino?.nombre ?? '—'}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {m.detalles?.slice(0, 2).map((d: any, i: number) => (
                                      <span key={i} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                        {TIPO_EMOJI[d.producto?.tipo] || '📦'} {d.cantidad}
                                      </span>
                                    ))}
                                    {(m.detalles?.length ?? 0) > 2 && (
                                      <span className="text-[10px] text-gray-400">+{(m.detalles?.length ?? 0) - 2}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{formatDate(m.fechaSolicitud)}</span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Lista mobile */}
                  <div className="sm:hidden divide-y divide-gray-50">
                    {[...movements]
                      .sort((a, b) => new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime())
                      .slice(0, 5)
                      .map((m) => {
                        const first = m.detalles?.[0];
                        const ESTADO_COLOR: Record<string, string> = {
                          pendiente: '#b45309', aprobado: '#166534', rechazado: '#be123c', anulado: '#6b7280',
                        };
                        return (
                          <a key={m.id} href="/historial" className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/40 transition-colors">
                            <span className="text-lg flex-shrink-0">{first ? (TIPO_EMOJI[first.producto?.tipo] || '📦') : '📦'}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {first ? first.producto?.nombre : `#${m.id}`}
                                <span className="text-muted-foreground font-normal"> × {first?.cantidad ?? '?'}</span>
                                {(m.detalles?.length ?? 0) > 1 ? ` +${(m.detalles?.length ?? 0) - 1}` : ''}
                              </p>
                              <p className="text-xs mt-0.5 text-muted-foreground truncate">
                                {(m as any).almacenOrigen?.nombre} → {(m as any).almacenDestino?.nombre}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className="text-[10px] font-bold" style={{ color: ESTADO_COLOR[m.estado] || '#374151' }}>
                                {m.estado.charAt(0).toUpperCase() + m.estado.slice(1)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{formatDate(m.fechaSolicitud)}</span>
                            </div>
                          </a>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          </div>


        </div>
      </div>

      <ModalSalida
        open={showModalSalida}
        onClose={() => setShowModalSalida(false)}
        onSuccess={fetchStats}
      />
      <ModalRecepciones
        open={showModalRecepciones}
        onClose={() => setShowModalRecepciones(false)}
        onSuccess={fetchStats}
      />
    </div>
  );
}

