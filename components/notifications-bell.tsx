'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, X, Check, Package, CheckCircle, XCircle, Info, ArrowRight } from 'lucide-react';

interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  createdAt: string;
  movimientoId: number | null;
}

interface Props {
  onOpenRecepciones?: () => void;
}

export default function NotificationsBell({ onOpenRecepciones }: Props) {
  const { data: session } = useSession();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verTodas, setVerTodas] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Registrar Service Worker y suscribirse a push
  useEffect(() => {
    if (!session?.user || typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const registerPush = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const existing = await reg.pushManager.getSubscription();
        if (existing) return; // ya suscrito

        const res = await fetch('/api/push');
        const { publicKey } = await res.json();

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey,
        });

        await fetch('/api/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        });
      } catch { }
    };

    registerPush();
  }, [session]);

  const fetchNotificaciones = async () => {
    if (!session?.user) return;
    try {
      const r = await fetch('/api/notificaciones');
      if (r.ok) {
        const data = await r.json();
        setNotificaciones(data);
        setNoLeidas(data.filter((n: Notificacion) => !n.leida).length);
      }
    } catch { }
  };

  useEffect(() => {
    fetchNotificaciones();
    const interval = setInterval(fetchNotificaciones, 30000);
    return () => clearInterval(interval);
  }, [session]);

  const handleToggle = () => {
    setIsOpen(v => !v);
    if (!isOpen) fetchNotificaciones();
  };

  const marcarComoLeida = async (id: number) => {
    try {
      await fetch(`/api/notificaciones/${id}`, { method: 'PATCH' });
      fetchNotificaciones();
    } catch { }
  };

  const marcarTodasComoLeidas = async () => {
    setLoading(true);
    try {
      await fetch('/api/notificaciones', { method: 'PATCH' });
      fetchNotificaciones();
    } finally { setLoading(false); }
  };

  const formatFecha = (fecha: string) => {
    const d = new Date(fecha);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}m`;
    if (hrs < 24) return `${hrs}h`;
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  /* ── Ícono según tipo ── */
  const TipoIcon = ({ tipo }: { tipo: string }) => {
    if (tipo === 'nuevo_movimiento') return <Package className="w-4 h-4 text-blue-500" />;
    if (tipo === 'movimiento_aprobado') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (tipo === 'movimiento_rechazado') return <XCircle className="w-4 h-4 text-red-500" />;
    return <Info className="w-4 h-4 text-gray-400" />;
  };

  const TipoBg: Record<string, string> = {
    nuevo_movimiento: 'bg-blue-50',
    movimiento_aprobado: 'bg-emerald-50',
    movimiento_rechazado: 'bg-red-50',
  };

  /* ── Acción primaria según tipo ── */
  const handleAccion = (notif: Notificacion) => {
    if (!notif.leida) marcarComoLeida(notif.id);
    setIsOpen(false);

    if (notif.tipo === 'nuevo_movimiento') {
      // Abrir el modal de recepciones si está disponible, sino navegar
      if (onOpenRecepciones) {
        onOpenRecepciones();
      } else {
        window.location.href = '/recepciones';
      }
    } else if (notif.tipo === 'movimiento_rechazado') {
      window.location.href = '/mis-movimientos';
    } else if (notif.tipo === 'movimiento_aprobado') {
      window.location.href = '/inventario';
    }
  };

  const getAccionLabel = (tipo: string) => {
    if (tipo === 'nuevo_movimiento') return 'Ver recepciones';
    if (tipo === 'movimiento_rechazado') return 'Ver movimiento';
    if (tipo === 'movimiento_aprobado') return 'Ver inventario';
    return null;
  };

  if (!session?.user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Campana ── */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-xl text-muted-foreground hover:bg-muted/60 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-1 ring-card">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {/* ── Panel ── */}
      {isOpen && (
        <>
          {/* Backdrop mobile */}
          <div
            className="fixed inset-0 bg-black/20 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="
            z-50 bg-white border border-border/60 shadow-2xl flex flex-col overflow-hidden
            fixed left-3 right-3 top-[4.5rem] rounded-2xl max-h-[75vh]
            sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-h-[520px] sm:rounded-xl sm:left-auto
          ">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-bold text-foreground">Notificaciones</span>
                {noLeidas > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                    {noLeidas}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {noLeidas > 0 && (
                  <button
                    onClick={marcarTodasComoLeidas}
                    disabled={loading}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Check className="w-3 h-3" /> Leídas
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/60 sm:hidden"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1">
              {(() => {
                const sorted = [...notificaciones].sort(
                  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                const visibles = verTodas ? sorted : sorted.filter(n => !n.leida);

                if (visibles.length === 0 && !verTodas) {
                  return (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <CheckCircle className="w-10 h-10 text-gray-200" />
                      <p className="text-sm text-gray-400">Todo al día</p>
                      {notificaciones.length > 0 && (
                        <button
                          onClick={() => setVerTodas(true)}
                          className="text-xs text-blue-600 hover:underline mt-1"
                        >
                          Ver historial
                        </button>
                      )}
                    </div>
                  );
                }

                if (notificaciones.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Bell className="w-10 h-10 text-gray-200" />
                      <p className="text-sm text-gray-400">Sin notificaciones</p>
                    </div>
                  );
                }

                return (
                  <div>
                    {visibles.map(notif => {
                      const accionLabel = getAccionLabel(notif.tipo);
                      return (
                        <div
                          key={notif.id}
                          className={`px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${!notif.leida ? 'bg-blue-50/50' : 'bg-white hover:bg-gray-50'}`}
                        >
                          <div className="flex gap-3">
                            <div className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center mt-0.5 ${TipoBg[notif.tipo] || 'bg-gray-100'}`}>
                              <TipoIcon tipo={notif.tipo} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-900 leading-tight">{notif.titulo}</p>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {!notif.leida && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />}
                                  <span className="text-[10px] text-gray-400">{formatFecha(notif.createdAt)}</span>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.mensaje}</p>
                              {accionLabel && (
                                <button
                                  onClick={() => handleAccion(notif)}
                                  className="mt-2 flex items-center gap-1 text-xs font-semibold transition-colors rounded-lg px-2.5 py-1"
                                  style={{
                                    color: notif.tipo === 'movimiento_rechazado' ? '#e11d48' : notif.tipo === 'movimiento_aprobado' ? '#059669' : '#2563eb',
                                    background: notif.tipo === 'movimiento_rechazado' ? '#fff1f2' : notif.tipo === 'movimiento_aprobado' ? '#f0fdf4' : '#eff6ff',
                                  }}
                                >
                                  <ArrowRight className="w-3 h-3" />
                                  {accionLabel}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Footer: Ver todas / Ver solo no leídas */}
            <div className="border-t border-border/50 px-4 py-2.5 flex-shrink-0">
              <button
                onClick={() => setVerTodas(v => !v)}
                className="w-full text-xs text-center text-blue-600 hover:text-blue-700 font-medium py-1 rounded-lg hover:bg-blue-50 transition-colors"
              >
                {verTodas ? 'Ver solo no leídas' : `Ver todas (${notificaciones.length})`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
