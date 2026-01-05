'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/navigation';
import { generarPDFRecepcion } from '@/lib/utils/pdf';

interface Movimiento {
  id: number;
  estado: string;
  observaciones: string | null;
  fechaSolicitud: string;
  almacenOrigen: {
    id: number;
    nombre: string;
  };
  usuarioSolicitante: {
    id: number;
    nombre: string;
  };
  detalles: Array<{
    id: number;
    cantidad: number;
    producto: {
      id: number;
      codigo: string;
      nombre: string;
      tipo: string;
    };
  }>;
}

export default function RecepcionesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userAlmacenId, setUserAlmacenId] = useState<number | null>(null);
  const [almacenes, setAlmacenes] = useState<Array<{ id: number; nombre: string }>>([]);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user) {
      const almacenId = (session.user as any).almacenId;
      fetchAlmacenes();
      if (almacenId) {
        setUserAlmacenId(almacenId);
        fetchMovimientos(almacenId);
      } else {
        setLoading(false);
        setMessage({ type: 'error', text: 'Tu usuario no tiene un almacén asignado' });
      }
    }
  }, [session, status, router]);

  const fetchAlmacenes = async () => {
    try {
      const response = await fetch('/api/almacenes');
      const data = await response.json();
      setAlmacenes(data);
    } catch (error) {
      console.error('Error al cargar almacenes:', error);
    }
  };

  const fetchMovimientos = async (almacenId: number) => {
    try {
      const response = await fetch(`/api/movimientos?almacenDestinoId=${almacenId}`);
      const data = await response.json();
      setMovimientos(data);
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
      setMessage({ type: 'error', text: 'Error al cargar movimientos pendientes' });
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (movimientoId: number) => {
    if (!session?.user?.id) {
      setMessage({ type: 'error', text: 'No estás autenticado' });
      return;
    }

    setProcessing(movimientoId);
    setMessage(null);

    try {
      const response = await fetch(`/api/movimientos/${movimientoId}/aprobar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuarioAprobadorId: parseInt(session.user.id) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al aprobar movimiento');
      }

      setMessage({ type: 'success', text: 'Movimiento aprobado exitosamente' });

      // Obtener información completa del movimiento aprobado para el PDF
      const movimientoAprobado = movimientos.find(m => m.id === movimientoId);
      if (movimientoAprobado) {
        const almacenDestino = almacenes.find(a => a.id === userAlmacenId);

        // Generar PDF de recepción
        if (almacenDestino) {
          generarPDFRecepcion({
            id: movimientoAprobado.id,
            fechaSolicitud: movimientoAprobado.fechaSolicitud,
            fechaAprobacion: new Date().toISOString(),
            almacenOrigen: movimientoAprobado.almacenOrigen,
            almacenDestino: {
              id: almacenDestino.id,
              nombre: almacenDestino.nombre,
            },
            usuarioSolicitante: movimientoAprobado.usuarioSolicitante,
            usuarioAprobador: {
              id: parseInt(session.user.id),
              nombre: session.user.name || 'Usuario',
            },
            observaciones: movimientoAprobado.observaciones,
            detalles: movimientoAprobado.detalles.map(d => ({
              codigo: d.producto.codigo,
              nombre: d.producto.nombre,
              tipo: d.producto.tipo,
              cantidad: d.cantidad,
              unidadMedida: 'unidad',
            })),
          });
        }
      }

      // Recargar movimientos
      if (userAlmacenId) {
        fetchMovimientos(userAlmacenId);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setProcessing(null);
    }
  };

  const handleRechazar = async (movimientoId: number) => {
    console.log('[handleRechazar] Function called with movimientoId:', movimientoId);
    console.log('[handleRechazar] Session:', session);
    console.log('[handleRechazar] User ID:', session?.user?.id);

    if (!session?.user?.id) {
      setMessage({ type: 'error', text: 'No estás autenticado' });
      return;
    }

    const observaciones = prompt('Ingresa el motivo del rechazo (opcional):');
    console.log('[handleRechazar] Observaciones entered:', observaciones);

    // Si el usuario cancela el prompt, no hacer nada
    if (observaciones === null) {
      return;
    }

    setProcessing(movimientoId);
    setMessage(null);

    try {
      const response = await fetch(`/api/movimientos/${movimientoId}/rechazar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuarioAprobadorId: parseInt(session.user.id),
          observaciones,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al rechazar movimiento');
      }

      setMessage({ type: 'success', text: 'Movimiento rechazado exitosamente' });

      if (userAlmacenId) {
        fetchMovimientos(userAlmacenId);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setProcessing(null);
    }
  };

  const getTipoIcon = (tipo: string) => {
    const icons: Record<string, string> = {
      canastillo_negro: '⬛',
      canastillo_color: '🎨',
      cooler: '❄️',
      caja: '📦',
    };
    return icons[tipo] || '📦';
  };

  const getTotalUnidades = (movimiento: Movimiento) => {
    return movimiento.detalles.reduce((sum, det) => sum + det.cantidad, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6]">
        <Navigation />
        {/* Spacer for fixed navigation */}
        <div className="h-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8">
          <div className="card bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
              <p className="ml-4 text-sm sm:text-base text-[#64748B]">Cargando movimientos pendientes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e8e8e8' }}>
      <Navigation />
      {/* Spacer for fixed navigation */}
      <div className="h-20"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-['Playfair_Display'] font-bold text-[#1F2937] mb-2">
            Recepciones Pendientes
          </h1>
          <p className="text-sm sm:text-base text-[#64748B]">
            Aprueba o rechaza las llegadas de productos a tu almacén
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
              }`}
          >
            {message.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {!userAlmacenId ? (
          <div className="card bg-white">
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-[#CBD5E1] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-[#64748B] text-lg font-medium">Tu usuario no tiene un almacén asignado</p>
              <p className="text-[#94A3B8] text-sm mt-2">Contacta a un administrador</p>
            </div>
          </div>
        ) : movimientos.length === 0 ? (
          <div className="card bg-white">
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-[#CBD5E1] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[#64748B] text-lg font-medium">No hay recepciones pendientes</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {movimientos.map((mov) => (
              <div key={mov.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-5">
                {/* Header */}
                <div className="mb-4 pb-3 border-b border-slate-200">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                        PENDIENTE
                      </span>
                      <span className="text-sm sm:text-base font-bold text-[#1F2937]">
                        Movimiento #{mov.id}
                      </span>
                    </div>
                    <div className="text-xs text-[#64748B]">
                      {new Date(mov.fechaSolicitud).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
                  <div>
                    <p className="text-xs text-[#64748B] mb-1">Almacén Origen</p>
                    <p className="font-semibold text-sm sm:text-base text-[#1F2937]">{mov.almacenOrigen.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B] mb-1">Solicitante</p>
                    <p className="font-semibold text-sm sm:text-base text-[#1F2937]">{mov.usuarioSolicitante.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#64748B] mb-1">Total Unidades</p>
                    <p className="text-lg sm:text-xl font-['Playfair_Display'] font-bold text-green-600">{getTotalUnidades(mov)}</p>
                  </div>
                </div>

                {mov.observaciones && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-3 mb-4">
                    <p className="text-xs font-bold text-blue-900 uppercase mb-1">Observaciones</p>
                    <p className="text-sm text-blue-800">{mov.observaciones}</p>
                  </div>
                )}

                {/* Products Table */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-[#64748B] uppercase mb-2">Productos a Recibir</p>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-full">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="text-left py-2.5 px-3 text-xs font-semibold text-[#64748B] uppercase">Producto</th>
                            <th className="text-center py-2.5 px-3 text-xs font-semibold text-[#64748B] uppercase w-20 sm:w-24">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mov.detalles.map((detalle, index) => (
                            <tr
                              key={detalle.id}
                              className={`border-t border-slate-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                            >
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-base sm:text-lg flex-shrink-0">{getTipoIcon(detalle.producto.tipo)}</span>
                                  <div className="min-w-0">
                                    <p className="font-medium text-xs sm:text-sm text-[#1F2937] truncate">{detalle.producto.nombre}</p>
                                    <p className="text-xs text-[#64748B]">{detalle.producto.codigo}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="inline-flex items-center justify-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-bold text-xs sm:text-sm">
                                  {detalle.cantidad}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={() => handleAprobar(mov.id)}
                    disabled={processing === mov.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-bold text-sm sm:text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing === mov.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                        <span className="text-sm sm:text-base">Procesando...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm sm:text-base">Aprobar</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      console.log('[Rechazar Button] Clicked! Movement ID:', mov.id);
                      handleRechazar(mov.id);
                    }}
                    disabled={processing === mov.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-bold text-sm sm:text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing === mov.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                        <span className="text-sm sm:text-base">Procesando...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="text-sm sm:text-base">Rechazar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
