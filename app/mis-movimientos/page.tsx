'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/navigation';

interface Movimiento {
  id: number;
  estado: string;
  observaciones: string | null;
  transportadoPor: string | null;
  fechaSolicitud: string;
  fechaAprobacion: string | null;
  almacenDestino: {
    id: number;
    nombre: string;
  };
  usuarioAprobador: {
    id: number;
    nombre: string;
  } | null;
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

export default function MisMovimientosPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingMovimiento, setEditingMovimiento] = useState<number | null>(null);
  const [editDetalles, setEditDetalles] = useState<Array<{ productoId: number; cantidad: number }>>([]);
  const [editObservaciones, setEditObservaciones] = useState<string>('');
  const [editTransportadoPor, setEditTransportadoPor] = useState<string>('');
  const [processing, setProcessing] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.id) {
      fetchMisMovimientos();
    }
  }, [session, status, router]);

  const fetchMisMovimientos = async () => {
    if (!session?.user?.id) {
      setLoading(false);
      setMessage({ type: 'error', text: 'No estás autenticado' });
      return;
    }

    try {
      const response = await fetch(`/api/mis-movimientos?usuarioId=${session.user.id}`);
      const data = await response.json();
      setMovimientos(data);
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
      setMessage({ type: 'error', text: 'Error al cargar tus movimientos' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (movimiento: Movimiento) => {
    setEditingMovimiento(movimiento.id);
    setEditDetalles(movimiento.detalles.map(d => ({ productoId: d.producto.id, cantidad: d.cantidad })));
    setEditObservaciones(movimiento.observaciones || '');
    setEditTransportadoPor(movimiento.transportadoPor || '');
  };

  const handleCancelEdit = () => {
    setEditingMovimiento(null);
    setEditDetalles([]);
    setEditObservaciones('');
    setEditTransportadoPor('');
  };

  const handleUpdateCantidad = (productoId: number, nuevaCantidad: number) => {
    setEditDetalles(prev =>
      prev.map(d => d.productoId === productoId ? { ...d, cantidad: nuevaCantidad } : d)
    );
  };

  const handleReenviar = async (movimientoId: number) => {
    setMessage(null);
    setProcessing(movimientoId);

    try {
      const response = await fetch(`/api/movimientos/${movimientoId}/reenviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detalles: editDetalles,
          observaciones: editObservaciones,
          transportadoPor: editTransportadoPor,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al reenviar movimiento');
      }

      setMessage({ type: 'success', text: 'Movimiento reenviado exitosamente' });
      setEditingMovimiento(null);
      setEditDetalles([]);
      setEditObservaciones('');
      setEditTransportadoPor('');
      fetchMisMovimientos();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setProcessing(null);
    }
  };

  const handleAnular = async (movimientoId: number) => {
    const observaciones = prompt('Ingresa el motivo de la anulación (opcional):');

    // Si el usuario cancela el prompt, no hacer nada
    if (observaciones === null) {
      return;
    }

    setMessage(null);
    setProcessing(movimientoId);

    try {
      const response = await fetch(`/api/movimientos/${movimientoId}/anular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observaciones }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al anular movimiento');
      }

      setMessage({ type: 'success', text: 'Movimiento anulado exitosamente' });
      fetchMisMovimientos();
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

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pendiente: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'PENDIENTE' },
      aprobado: { bg: 'bg-green-100', text: 'text-green-800', label: 'APROBADO' },
      rechazado: { bg: 'bg-red-100', text: 'text-red-800', label: 'RECHAZADO' },
      anulado: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'ANULADO' },
    };

    const badge = badges[estado] || badges.pendiente;
    return (
      <span className={`badge ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getTotalUnidades = (movimiento: Movimiento) => {
    return movimiento.detalles.reduce((sum, det) => sum + det.cantidad, 0);
  };

  // Only show pending and rejected movements
  const movimientosFiltrados = movimientos.filter(m => m.estado === 'pendiente' || m.estado === 'rechazado');
  const movimientosPendientes = movimientosFiltrados.filter(m => m.estado === 'pendiente');
  const movimientosRechazados = movimientosFiltrados.filter(m => m.estado === 'rechazado');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6]">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          <div className="card bg-white">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
              <p className="ml-4 text-[#64748B]">Cargando tus movimientos...</p>
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
            Mis Movimientos
          </h1>
          <p className="text-blue-100 text-lg">
            Historial de movimientos que has creado
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

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="card bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#64748B] text-sm font-medium">Pendientes</p>
                <p className="text-3xl font-['Montserrat'] font-bold text-yellow-600 mt-1">
                  {movimientosPendientes.length}
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
                <p className="text-[#64748B] text-sm font-medium">Rechazados</p>
                <p className="text-3xl font-['Montserrat'] font-bold text-red-600 mt-1">
                  {movimientosRechazados.length}
                </p>
              </div>
              <div className="bg-red-100 rounded-full p-3">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {movimientosFiltrados.length === 0 ? (
          <div className="card bg-white">
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-[#CBD5E1] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[#64748B] text-lg">No tienes movimientos pendientes o rechazados</p>
              <p className="text-[#64748B] text-sm mt-2">Todos tus movimientos han sido procesados</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {movimientosFiltrados.map((mov) => (
              <div key={mov.id} className="card bg-white hover:shadow-xl transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  {/* Left Side - Movimiento Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      {getEstadoBadge(mov.estado)}
                      <span className="text-sm text-[#64748B]">
                        Movimiento #{mov.id}
                      </span>
                      <span className="text-sm text-[#64748B]">
                        {new Date(mov.fechaSolicitud).toLocaleDateString('es-ES')}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-[#64748B] mb-1">Almacén Destino</p>
                        <p className="text-base font-semibold text-[#1F2937]">
                          {mov.almacenDestino.nombre}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#64748B] mb-1">Total Unidades</p>
                        <p className="text-2xl font-['Montserrat'] font-bold text-[#10B981]">
                          {getTotalUnidades(mov)}
                        </p>
                      </div>
                      {mov.usuarioAprobador && (
                        <div>
                          <p className="text-sm font-medium text-[#64748B] mb-1">Aprobado por</p>
                          <p className="text-base text-[#1F2937]">
                            👤 {mov.usuarioAprobador.nombre}
                          </p>
                        </div>
                      )}
                      {mov.fechaAprobacion && (
                        <div>
                          <p className="text-sm font-medium text-[#64748B] mb-1">Fecha Aprobación</p>
                          <p className="text-base text-[#1F2937]">
                            {new Date(mov.fechaAprobacion).toLocaleString('es-ES')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Observaciones and Transportado Por - Editable when editing rejected */}
                    {editingMovimiento === mov.id && mov.estado === 'rechazado' ? (
                      <div className="space-y-3 mb-4">
                        <div>
                          <label className="text-sm font-medium text-[#64748B] mb-1 block">
                            Observaciones:
                          </label>
                          <textarea
                            value={editObservaciones}
                            onChange={(e) => setEditObservaciones(e.target.value)}
                            className="w-full px-3 py-2 border border-[#2563EB] rounded-lg text-sm"
                            rows={2}
                            placeholder="Ingresa observaciones..."
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-[#64748B] mb-1 block">
                            Transportado por:
                          </label>
                          <input
                            type="text"
                            value={editTransportadoPor}
                            onChange={(e) => setEditTransportadoPor(e.target.value)}
                            className="w-full px-3 py-2 border border-[#2563EB] rounded-lg text-sm"
                            placeholder="Nombre del transportista..."
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        {mov.observaciones && (
                          <div className="bg-[#F9FAFB] rounded-lg p-3 mb-4">
                            <p className="text-sm font-medium text-[#64748B] mb-1">Observaciones:</p>
                            <p className="text-sm text-[#1F2937]">{mov.observaciones}</p>
                          </div>
                        )}
                        {mov.transportadoPor && (
                          <div className="bg-[#F9FAFB] rounded-lg p-3 mb-4">
                            <p className="text-sm font-medium text-[#64748B] mb-1">Transportado por:</p>
                            <p className="text-sm text-[#1F2937]">{mov.transportadoPor}</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Products List */}
                    <div>
                      <p className="text-sm font-semibold text-[#64748B] mb-3">Productos:</p>
                      <div className="space-y-2">
                        {mov.detalles.map((detalle) => {
                          const isEditing = editingMovimiento === mov.id;
                          const editDetalle = editDetalles.find(d => d.productoId === detalle.producto.id);

                          return (
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
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editDetalle?.cantidad || detalle.cantidad}
                                    onChange={(e) => handleUpdateCantidad(detalle.producto.id, parseInt(e.target.value))}
                                    min="1"
                                    className="w-20 px-2 py-1 border border-[#2563EB] rounded text-sm font-semibold text-[#1F2937] text-center"
                                  />
                                ) : (
                                  <>
                                    <p className="text-2xl font-['Montserrat'] font-bold text-[#1F2937]">
                                      {detalle.cantidad}
                                    </p>
                                    <p className="text-xs text-[#64748B]">unidades</p>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Actions */}
                  {mov.estado === 'pendiente' && (
                    <div className="lg:w-48 flex lg:flex-col gap-3">
                      <button
                        onClick={() => handleAnular(mov.id)}
                        disabled={processing === mov.id}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        {processing === mov.id ? 'Procesando...' : 'Anular'}
                      </button>
                    </div>
                  )}

                  {mov.estado === 'rechazado' && (
                    <div className="lg:w-48 flex lg:flex-col gap-3">
                      {editingMovimiento === mov.id ? (
                        <>
                          <button
                            onClick={() => handleReenviar(mov.id)}
                            disabled={processing === mov.id}
                            className="flex-1 btn-accent flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {processing === mov.id ? 'Procesando...' : 'Reenviar'}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={processing === mov.id}
                            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(mov)}
                            disabled={processing === mov.id}
                            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar y Reenviar
                          </button>
                          <button
                            onClick={() => handleAnular(mov.id)}
                            disabled={processing === mov.id}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            {processing === mov.id ? 'Procesando...' : 'Anular'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
