'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/navigation';

interface Movimiento {
  id: number;
  estado: string;
  observaciones: string | null;
  fechaSolicitud: string;
  fechaAprobacion: string | null;
  tipo: 'entrada' | 'salida';
  almacenOrigen: {
    id: number;
    nombre: string;
  };
  almacenDestino: {
    id: number;
    nombre: string;
  };
  usuarioSolicitante: {
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
      unidadMedida: string;
    };
  }>;
}

export default function HistorialPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedAlmacen, setSelectedAlmacen] = useState<number | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');

  useEffect(() => {
    const userId = localStorage.getItem('selectedUserId');
    if (userId) {
      fetchUserAlmacen(parseInt(userId));
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserAlmacen = async (userId: number) => {
    try {
      const response = await fetch('/api/users');
      const users = await response.json();
      const user = users.find((u: { id: number }) => u.id === userId);

      if (user && user.almacenId) {
        setSelectedAlmacen(user.almacenId);
        fetchMovimientos(user.almacenId);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error al cargar usuario:', error);
      setLoading(false);
    }
  };

  const fetchMovimientos = async (almacenId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/historial?almacenId=${almacenId}`);
      const data = await response.json();
      setMovimientos(data);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    } finally {
      setLoading(false);
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
    const styles: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      aprobado: 'bg-green-100 text-green-800',
      rechazado: 'bg-red-100 text-red-800',
    };

    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      aprobado: 'Aprobado',
      rechazado: 'Rechazado',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[estado] || 'bg-gray-100 text-gray-800'}`}>
        {labels[estado] || estado}
      </span>
    );
  };

  const getTipoBadge = (tipo: 'entrada' | 'salida') => {
    return tipo === 'entrada' ? (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
        📥 Entrada
      </span>
    ) : (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
        📤 Salida
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filtrar movimientos
  const filteredMovimientos = movimientos.filter((mov) => {
    if (filterEstado !== 'todos' && mov.estado !== filterEstado) return false;
    if (filterTipo !== 'todos' && mov.tipo !== filterTipo) return false;
    return true;
  });

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMovimientos = filteredMovimientos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMovimientos.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6]">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
          <div className="card bg-white">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
              <p className="ml-4 text-[#64748B]">Cargando historial...</p>
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
            Historial de Movimientos
          </h1>
          <p className="text-blue-100 text-lg">
            Registro completo de entradas y salidas de tu almacén
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="card bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#64748B] text-sm font-medium">Total</p>
                <p className="text-3xl font-['Montserrat'] font-bold text-[#1F2937] mt-1">
                  {movimientos.length}
                </p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <svg className="w-8 h-8 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#64748B] text-sm font-medium">Entradas</p>
                <p className="text-3xl font-['Montserrat'] font-bold text-blue-600 mt-1">
                  {movimientos.filter(m => m.tipo === 'entrada').length}
                </p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <span className="text-3xl">📥</span>
              </div>
            </div>
          </div>

          <div className="card bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#64748B] text-sm font-medium">Salidas</p>
                <p className="text-3xl font-['Montserrat'] font-bold text-purple-600 mt-1">
                  {movimientos.filter(m => m.tipo === 'salida').length}
                </p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <span className="text-3xl">📤</span>
              </div>
            </div>
          </div>

          <div className="card bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#64748B] text-sm font-medium">Aprobados</p>
                <p className="text-3xl font-['Montserrat'] font-bold text-green-600 mt-1">
                  {movimientos.filter(m => m.estado === 'aprobado').length}
                </p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card bg-white mb-6">
          <h3 className="text-lg font-['Montserrat'] font-semibold text-[#1F2937] mb-4">
            Filtros
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#64748B] mb-2">
                Estado
              </label>
              <select
                value={filterEstado}
                onChange={(e) => {
                  setFilterEstado(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-field"
              >
                <option value="todos">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#64748B] mb-2">
                Tipo de Movimiento
              </label>
              <select
                value={filterTipo}
                onChange={(e) => {
                  setFilterTipo(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-field"
              >
                <option value="todos">Todos</option>
                <option value="entrada">Entradas</option>
                <option value="salida">Salidas</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterEstado('todos');
                  setFilterTipo('todos');
                  setCurrentPage(1);
                }}
                className="btn-primary w-full"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Movimientos List */}
        <div className="card bg-white">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-['Montserrat'] font-semibold text-[#1F2937]">
              Movimientos ({filteredMovimientos.length})
            </h3>
            <div className="text-sm text-[#64748B]">
              Página {currentPage} de {totalPages || 1}
            </div>
          </div>

          {currentMovimientos.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-[#CBD5E1] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-[#64748B] text-lg">No hay movimientos para mostrar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentMovimientos.map((movimiento) => (
                <div
                  key={movimiento.id}
                  className="border border-[#E5E7EB] rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getTipoBadge(movimiento.tipo)}
                      {getEstadoBadge(movimiento.estado)}
                      <span className="text-sm font-mono text-[#64748B]">
                        #{movimiento.id}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#64748B]">
                        {formatDate(movimiento.fechaSolicitud)}
                      </p>
                      {movimiento.fechaAprobacion && (
                        <p className="text-xs text-[#94A3B8]">
                          Aprobado: {formatDate(movimiento.fechaAprobacion)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-[#64748B] mb-1">
                        {movimiento.tipo === 'entrada' ? 'De' : 'A'}:
                      </p>
                      <p className="font-medium text-[#1F2937]">
                        {movimiento.tipo === 'entrada'
                          ? movimiento.almacenOrigen.nombre
                          : movimiento.almacenDestino.nombre}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#64748B] mb-1">Solicitado por:</p>
                      <p className="font-medium text-[#1F2937]">
                        {movimiento.usuarioSolicitante.nombre}
                      </p>
                    </div>
                  </div>

                  {movimiento.usuarioAprobador && (
                    <div className="mb-3">
                      <p className="text-xs text-[#64748B] mb-1">Aprobado por:</p>
                      <p className="font-medium text-[#1F2937]">
                        {movimiento.usuarioAprobador.nombre}
                      </p>
                    </div>
                  )}

                  <div className="bg-[#F9FAFB] rounded-lg p-3 mb-3">
                    <p className="text-xs text-[#64748B] mb-2 font-semibold">
                      Productos ({movimiento.detalles.length}):
                    </p>
                    <div className="space-y-1">
                      {movimiento.detalles.map((detalle) => (
                        <div key={detalle.id} className="flex items-center justify-between text-sm">
                          <span className="text-[#1F2937]">
                            {getTipoIcon(detalle.producto.tipo)} {detalle.producto.nombre}
                          </span>
                          <span className="font-semibold text-[#2563EB]">
                            {detalle.cantidad} {detalle.producto.unidadMedida}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {movimiento.observaciones && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-[#64748B] mb-1">Observaciones:</p>
                      <p className="text-sm text-[#1F2937]">{movimiento.observaciones}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-[#E5E7EB]">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-[#F3F4F6] text-[#64748B] font-medium hover:bg-[#E5E7EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>

              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Mostrar solo páginas cercanas
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => paginate(page)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[#F3F4F6] text-[#64748B] hover:bg-[#E5E7EB]'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 3 || page === currentPage + 3) {
                    return <span key={page} className="px-2 text-[#64748B]">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-[#F3F4F6] text-[#64748B] font-medium hover:bg-[#E5E7EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
