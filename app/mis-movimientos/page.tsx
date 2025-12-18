'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/navigation';

interface Movimiento {
  id: number;
  estado: string;
  observaciones: string | null;
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
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingMovimiento, setEditingMovimiento] = useState<number | null>(null);
  const [editDetalles, setEditDetalles] = useState<Array<{ id: number; cantidad: number }>>([]);

  useEffect(() => {
    fetchMisMovimientos();
  }, []);

  const fetchMisMovimientos = async () => {
    const userId = localStorage.getItem('selectedUserId');
    if (!userId) {
      setLoading(false);
      setMessage({ type: 'error', text: 'Por favor selecciona un usuario' });
      return;
    }

    try {
      const response = await fetch(`/api/mis-movimientos?usuarioId=${userId}`);
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
    setEditDetalles(movimiento.detalles.map(d => ({ id: d.id, cantidad: d.cantidad })));
  };

  const handleCancelEdit = () => {
    setEditingMovimiento(null);
    setEditDetalles([]);
  };

  const handleUpdateCantidad = (detalleId: number, nuevaCantidad: number) => {
    setEditDetalles(prev =>
      prev.map(d => d.id === detalleId ? { ...d, cantidad: nuevaCantidad } : d)
    );
  };

  const handleSaveEdit = async (movimientoId: number) => {
    setMessage(null);

    try {
      const response = await fetch(`/api/movimientos/${movimientoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detalles: editDetalles }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar movimiento');
      }

      setMessage({ type: 'success', text: 'Movimiento actualizado exitosamente' });
      setEditingMovimiento(null);
      setEditDetalles([]);
      fetchMisMovimientos();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const handleCancelarMovimiento = async (movimientoId: number) => {
    if (!confirm('¿Estás seguro de cancelar este movimiento? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/movimientos/${movimientoId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cancelar movimiento');
      }

      setMessage({ type: 'success', text: 'Movimiento cancelado exitosamente' });
      fetchMisMovimientos();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setMessage({ type: 'error', text: errorMessage });
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

  const movimientosPendientes = movimientos.filter(m => m.estado === 'pendiente');
  const movimientosAprobados = movimientos.filter(m => m.estado === 'aprobado');
  const movimientosRechazados = movimientos.filter(m => m.estado === 'rechazado');

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="card bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#64748B] text-sm font-medium">Total Movimientos</p>
                <p className="text-3xl font-['Montserrat'] font-bold text-[#1F2937] mt-1">
                  {movimientos.length}
                </p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <svg className="w-8 h-8 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

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
                <p className="text-[#64748B] text-sm font-medium">Aprobados</p>
                <p className="text-3xl font-['Montserrat'] font-bold text-[#10B981] mt-1">
                  {movimientosAprobados.length}
                </p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-8 h-8 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

        {movimientos.length === 0 ? (
          <div className="card bg-white">
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-[#CBD5E1] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-[#64748B] text-lg">No has creado movimientos aún</p>
              <p className="text-[#64748B] text-sm mt-2">Ve a "Registrar Salida" para crear tu primer movimiento</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {movimientos.map((mov) => (
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

                    {mov.observaciones && (
                      <div className="bg-[#F9FAFB] rounded-lg p-3 mb-4">
                        <p className="text-sm font-medium text-[#64748B] mb-1">Observaciones:</p>
                        <p className="text-sm text-[#1F2937]">{mov.observaciones}</p>
                      </div>
                    )}

                    {/* Products List */}
                    <div>
                      <p className="text-sm font-semibold text-[#64748B] mb-3">Productos:</p>
                      <div className="space-y-2">
                        {mov.detalles.map((detalle) => {
                          const isEditing = editingMovimiento === mov.id;
                          const editDetalle = editDetalles.find(d => d.id === detalle.id);

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
                                    onChange={(e) => handleUpdateCantidad(detalle.id, parseInt(e.target.value))}
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
                      {editingMovimiento === mov.id ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(mov.id)}
                            className="flex-1 btn-accent flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Guardar
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(mov)}
                            className="flex-1 btn-primary flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </button>
                          <button
                            onClick={() => handleCancelarMovimiento(mov.id)}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Cancelar
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
