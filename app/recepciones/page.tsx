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
    if (!session?.user?.id) {
      setMessage({ type: 'error', text: 'No estás autenticado' });
      return;
    }

    const observaciones = prompt('Ingresa el motivo del rechazo (opcional):');

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          <div className="card bg-white">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
              <p className="ml-4 text-[#64748B]">Cargando movimientos pendientes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] rounded-2xl shadow-xl p-8 mb-8 text-white">
          <h1 className="text-4xl font-['Montserrat'] font-bold mb-3">
            Recepciones Pendientes
          </h1>
          <p className="text-blue-100 text-lg">
            Aprueba o rechaza las llegadas de productos a tu almacén
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {!userAlmacenId ? (
          <div className="card bg-white">
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-[#CBD5E1] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-[#64748B] text-lg">Tu usuario no tiene un almacén asignado</p>
              <p className="text-[#94A3B8] text-sm mt-2">Contacta a un administrador para asignar un almacén a tu usuario</p>
            </div>
          </div>
        ) : movimientos.length === 0 ? (
          <div className="card bg-white">
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-[#CBD5E1] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[#64748B] text-lg">No hay recepciones pendientes</p>
              <p className="text-[#64748B] text-sm mt-2">Los movimientos aparecerán aquí cuando otros almacenes te envíen productos</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="card bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#64748B] text-sm font-medium">Movimientos Pendientes</p>
                    <p className="text-3xl font-['Montserrat'] font-bold text-[#1F2937] mt-1">
                      {movimientos.length}
                    </p>
                  </div>
                  <div className="bg-yellow-100 rounded-full p-3">
                    <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="card bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#64748B] text-sm font-medium">Total Productos</p>
                    <p className="text-3xl font-['Montserrat'] font-bold text-[#1F2937] mt-1">
                      {movimientos.reduce((sum, mov) => sum + mov.detalles.length, 0)}
                    </p>
                  </div>
                  <div className="bg-blue-100 rounded-full p-3">
                    <svg className="w-8 h-8 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="card bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#64748B] text-sm font-medium">Total Unidades</p>
                    <p className="text-3xl font-['Montserrat'] font-bold text-[#10B981] mt-1">
                      {movimientos.reduce((sum, mov) => sum + getTotalUnidades(mov), 0)}
                    </p>
                  </div>
                  <div className="bg-green-100 rounded-full p-3">
                    <svg className="w-8 h-8 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Movimientos List */}
            <div className="space-y-4">
              {movimientos.map((mov) => (
                <div key={mov.id} className="card bg-white hover:shadow-xl transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    {/* Left Side - Movimiento Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="badge bg-yellow-100 text-yellow-800">
                          PENDIENTE
                        </span>
                        <span className="text-sm text-[#64748B]">
                          Movimiento #{mov.id}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-[#64748B] mb-1">Almacén Origen</p>
                          <p className="text-base font-semibold text-[#1F2937]">
                            {mov.almacenOrigen.nombre}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#64748B] mb-1">Solicitante</p>
                          <p className="text-base font-semibold text-[#1F2937]">
                            👤 {mov.usuarioSolicitante.nombre}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#64748B] mb-1">Fecha de Solicitud</p>
                          <p className="text-base text-[#1F2937]">
                            {new Date(mov.fechaSolicitud).toLocaleString('es-ES')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#64748B] mb-1">Total Unidades</p>
                          <p className="text-2xl font-['Montserrat'] font-bold text-[#10B981]">
                            {getTotalUnidades(mov)}
                          </p>
                        </div>
                      </div>

                      {mov.observaciones && (
                        <div className="bg-[#F9FAFB] rounded-lg p-3 mb-4">
                          <p className="text-sm font-medium text-[#64748B] mb-1">Observaciones:</p>
                          <p className="text-sm text-[#1F2937]">{mov.observaciones}</p>
                        </div>
                      )}

                      {/* Products List */}
                      <div>
                        <p className="text-sm font-semibold text-[#64748B] mb-3">Productos a Recibir:</p>
                        <div className="space-y-2">
                          {mov.detalles.map((detalle) => (
                            <div
                              key={detalle.id}
                              className="flex items-center justify-between bg-[#F9FAFB] rounded-lg p-3 border border-[#E5E7EB]"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">
                                  {getTipoIcon(detalle.producto.tipo)}
                                </span>
                                <div>
                                  <p className="font-medium text-[#1F2937]">
                                    {detalle.producto.nombre}
                                  </p>
                                  <p className="text-xs text-[#64748B] font-mono">
                                    {detalle.producto.codigo}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-['Montserrat'] font-bold text-[#1F2937]">
                                  {detalle.cantidad}
                                </p>
                                <p className="text-xs text-[#64748B]">unidades</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Actions */}
                    <div className="lg:w-48 flex lg:flex-col gap-3">
                      <button
                        onClick={() => handleAprobar(mov.id)}
                        disabled={processing === mov.id}
                        className="flex-1 btn-accent flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing === mov.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Procesando...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Aprobar
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRechazar(mov.id)}
                        disabled={processing === mov.id}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
