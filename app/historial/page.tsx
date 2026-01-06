'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/navigation';
import * as XLSX from 'xlsx';
import { generarPDFSalida, generarPDFRecepcion } from '@/lib/utils/pdf';

interface Movimiento {
  id: number;
  estado: string;
  observaciones: string | null;
  transportadoPor: string | null;
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
  const router = useRouter();
  const { data: session, status } = useSession();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedAlmacen, setSelectedAlmacen] = useState<number | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterMovimientos, setFilterMovimientos] = useState<string>('');

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user) {
      const almacenId = (session.user as any).almacenId;
      if (almacenId) {
        setSelectedAlmacen(almacenId);
        fetchMovimientos(almacenId);
      } else {
        setLoading(false);
      }
    }
  }, [session, status, router]);

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
      anulado: 'bg-gray-100 text-gray-800',
    };

    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      aprobado: 'Aprobado',
      rechazado: 'Rechazado',
      anulado: 'Anulado',
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

  const handleReimprimirSalida = (movimiento: Movimiento) => {
    generarPDFSalida({
      id: movimiento.id,
      estado: movimiento.estado,
      fechaSolicitud: movimiento.fechaSolicitud,
      fechaAprobacion: movimiento.fechaAprobacion || undefined,
      almacenOrigen: movimiento.almacenOrigen,
      almacenDestino: movimiento.almacenDestino,
      usuarioSolicitante: movimiento.usuarioSolicitante,
      usuarioAprobador: movimiento.usuarioAprobador || undefined,
      transportadoPor: movimiento.transportadoPor || undefined,
      observaciones: movimiento.observaciones || undefined,
      detalles: movimiento.detalles.map(d => ({
        codigo: d.producto.codigo,
        nombre: d.producto.nombre,
        tipo: d.producto.tipo,
        cantidad: d.cantidad,
        unidadMedida: d.producto.unidadMedida,
      })),
    });
  };

  const handleReimprimirRecepcion = (movimiento: Movimiento) => {
    generarPDFRecepcion({
      id: movimiento.id,
      estado: movimiento.estado,
      fechaSolicitud: movimiento.fechaSolicitud,
      fechaAprobacion: movimiento.fechaAprobacion || undefined,
      almacenOrigen: movimiento.almacenOrigen,
      almacenDestino: movimiento.almacenDestino,
      usuarioSolicitante: movimiento.usuarioSolicitante,
      usuarioAprobador: movimiento.usuarioAprobador || undefined,
      transportadoPor: movimiento.transportadoPor || undefined,
      observaciones: movimiento.observaciones || undefined,
      detalles: movimiento.detalles.map(d => ({
        codigo: d.producto.codigo,
        nombre: d.producto.nombre,
        tipo: d.producto.tipo,
        cantidad: d.cantidad,
        unidadMedida: d.producto.unidadMedida,
      })),
    });
  };

  const exportToExcel = () => {
    // Preparar datos para Excel
    const excelData = filteredMovimientos.map(mov => {
      // Crear una fila base con la información del movimiento
      const baseRow = {
        'ID Movimiento': mov.id,
        'Tipo': mov.tipo === 'entrada' ? 'Entrada' : 'Salida',
        'Estado': mov.estado.charAt(0).toUpperCase() + mov.estado.slice(1),
        'Almacén Origen': mov.almacenOrigen.nombre,
        'Almacén Destino': mov.almacenDestino.nombre,
        'Usuario Solicitante': mov.usuarioSolicitante.nombre,
        'Usuario Aprobador': mov.usuarioAprobador?.nombre || 'N/A',
        'Fecha Solicitud': formatDate(mov.fechaSolicitud),
        'Fecha Aprobación': mov.fechaAprobacion ? formatDate(mov.fechaAprobacion) : 'N/A',
        'Observaciones': mov.observaciones || 'N/A',
      };

      // Si hay detalles, crear una fila por cada producto
      if (mov.detalles && mov.detalles.length > 0) {
        return mov.detalles.map((detalle, index) => ({
          ...baseRow,
          'Producto Código': detalle.producto.codigo,
          'Producto Nombre': detalle.producto.nombre,
          'Producto Tipo': detalle.producto.tipo,
          'Cantidad': detalle.cantidad,
          'Unidad': detalle.producto.unidadMedida,
        }));
      }

      // Si no hay detalles, devolver solo la fila base
      return [{
        ...baseRow,
        'Producto Código': 'N/A',
        'Producto Nombre': 'Sin productos',
        'Producto Tipo': 'N/A',
        'Cantidad': 0,
        'Unidad': 'N/A',
      }];
    }).flat(); // Aplanar el array de arrays

    // Crear libro de trabajo
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial');

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 12 }, // ID Movimiento
      { wch: 10 }, // Tipo
      { wch: 12 }, // Estado
      { wch: 20 }, // Almacén Origen
      { wch: 20 }, // Almacén Destino
      { wch: 20 }, // Usuario Solicitante
      { wch: 20 }, // Usuario Aprobador
      { wch: 18 }, // Fecha Solicitud
      { wch: 18 }, // Fecha Aprobación
      { wch: 30 }, // Observaciones
      { wch: 15 }, // Producto Código
      { wch: 25 }, // Producto Nombre
      { wch: 18 }, // Producto Tipo
      { wch: 10 }, // Cantidad
      { wch: 10 }, // Unidad
    ];
    ws['!cols'] = colWidths;

    // Generar nombre de archivo con timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `historial_movimientos_${timestamp}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, filename);
  };

  // Filtrar movimientos
  const filteredMovimientos = movimientos.filter((mov) => {
    if (filterEstado !== 'todos' && mov.estado !== filterEstado) return false;
    if (filterTipo !== 'todos' && mov.tipo !== filterTipo) return false;

    // Filtrar por números de movimiento
    if (filterMovimientos.trim() !== '') {
      const numerosIngresados = filterMovimientos
        .split(',')
        .map(num => num.trim())
        .filter(num => num !== '')
        .map(num => parseInt(num))
        .filter(num => !isNaN(num));

      if (numerosIngresados.length > 0) {
        if (!numerosIngresados.includes(mov.id)) return false;
      }
    }

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="card bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#64748B] text-xs font-medium">Total</p>
                <p className="text-2xl font-['Montserrat'] font-bold text-[#1F2937] mt-1">
                  {movimientos.length}
                </p>
              </div>
              <div className="bg-blue-100 rounded-full p-2">
                <svg className="w-6 h-6 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#64748B] text-xs font-medium">Entradas</p>
                <p className="text-2xl font-['Montserrat'] font-bold text-blue-600 mt-1">
                  {movimientos.filter(m => m.tipo === 'entrada').length}
                </p>
              </div>
              <div className="bg-blue-100 rounded-full p-2">
                <span className="text-2xl">📥</span>
              </div>
            </div>
          </div>

          <div className="card bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#64748B] text-xs font-medium">Salidas</p>
                <p className="text-2xl font-['Montserrat'] font-bold text-purple-600 mt-1">
                  {movimientos.filter(m => m.tipo === 'salida').length}
                </p>
              </div>
              <div className="bg-purple-100 rounded-full p-2">
                <span className="text-2xl">📤</span>
              </div>
            </div>
          </div>

          <div className="card bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#64748B] text-xs font-medium">Aprobados</p>
                <p className="text-2xl font-['Montserrat'] font-bold text-green-600 mt-1">
                  {movimientos.filter(m => m.estado === 'aprobado').length}
                </p>
              </div>
              <div className="bg-green-100 rounded-full p-2">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#64748B] text-xs font-medium">Rechazados</p>
                <p className="text-2xl font-['Montserrat'] font-bold text-red-600 mt-1">
                  {movimientos.filter(m => m.estado === 'rechazado').length}
                </p>
              </div>
              <div className="bg-red-100 rounded-full p-2">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#64748B] text-xs font-medium">Anulados</p>
                <p className="text-2xl font-['Montserrat'] font-bold text-gray-600 mt-1">
                  {movimientos.filter(m => m.estado === 'anulado').length}
                </p>
              </div>
              <div className="bg-gray-100 rounded-full p-2">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
                <option value="anulado">Anulado</option>
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

            <div>
              <label className="block text-sm font-medium text-[#64748B] mb-2">
                N° de Movimiento(s)
              </label>
              <input
                type="text"
                value={filterMovimientos}
                onChange={(e) => {
                  setFilterMovimientos(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Ej: 25, 30, 45"
                className="input-field"
              />
              <p className="text-xs text-[#64748B] mt-1">Separa múltiples números con comas</p>
            </div>

            <div className="flex items-end gap-3">
              <button
                onClick={() => {
                  setFilterEstado('todos');
                  setFilterTipo('todos');
                  setFilterMovimientos('');
                  setCurrentPage(1);
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-colors"
              >
                Limpiar Filtros
              </button>
              <button
                onClick={exportToExcel}
                disabled={filteredMovimientos.length === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar Excel
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
                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                      <p className="text-xs text-[#64748B] mb-1">Observaciones:</p>
                      <p className="text-sm text-[#1F2937]">{movimiento.observaciones}</p>
                    </div>
                  )}

                  {/* Botones de reimpresión */}
                  <div className="flex gap-2 pt-3 border-t border-[#E5E7EB]">
                    <button
                      onClick={() => handleReimprimirSalida(movimiento)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      PDF Salida
                    </button>
                    {movimiento.estado === 'aprobado' && (
                      <button
                        onClick={() => handleReimprimirRecepcion(movimiento)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        PDF Recepción
                      </button>
                    )}
                  </div>
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
