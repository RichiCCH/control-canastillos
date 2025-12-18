'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/navigation';

interface Almacen {
  id: number;
  nombre: string;
  ubicacion: string | null;
}

interface InventarioItem {
  id: number;
  cantidad: number;
  producto: {
    id: number;
    codigo: string;
    nombre: string;
    tipo: string;
    unidadMedida: string;
  };
}

export default function InventarioPage() {
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [almacenSeleccionado, setAlmacenSeleccionado] = useState<string>('');
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAlmacenes();
  }, []);

  useEffect(() => {
    if (almacenSeleccionado) {
      fetchInventario(parseInt(almacenSeleccionado));
    }
  }, [almacenSeleccionado]);

  const fetchAlmacenes = async () => {
    try {
      const response = await fetch('/api/almacenes');
      const data = await response.json();
      setAlmacenes(data);
    } catch (error) {
      console.error('Error al cargar almacenes:', error);
    }
  };

  const fetchInventario = async (almacenId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/inventario?almacenId=${almacenId}`);
      const data = await response.json();
      setInventario(data);
    } catch (error) {
      console.error('Error al cargar inventario:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalUnidades = inventario.reduce((sum, item) => sum + item.cantidad, 0);

  const getTipoIcon = (tipo: string) => {
    const icons: Record<string, string> = {
      canastillo_negro: '⬛',
      canastillo_color: '🎨',
      cooler: '❄️',
      caja: '📦',
    };
    return icons[tipo] || '📦';
  };

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      canastillo_negro: 'bg-gray-100 text-gray-800',
      canastillo_color: 'bg-purple-100 text-purple-800',
      cooler: 'bg-blue-100 text-blue-800',
      caja: 'bg-yellow-100 text-yellow-800',
    };

    const labels: Record<string, string> = {
      canastillo_negro: 'Canastillo Negro',
      canastillo_color: 'Canastillo Color',
      cooler: 'Cooler',
      caja: 'Caja',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[tipo] || 'bg-gray-100 text-gray-800'}`}>
        {getTipoIcon(tipo)} {labels[tipo] || tipo}
      </span>
    );
  };

  const almacenActual = almacenes.find(a => a.id === parseInt(almacenSeleccionado));

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] rounded-2xl shadow-xl p-8 mb-8 text-white">
          <h1 className="text-4xl font-['Montserrat'] font-bold mb-3">
            Inventario por Almacén
          </h1>
          <p className="text-blue-100 text-lg">
            Consulta las existencias de productos en cada ubicación
          </p>
        </div>

        {/* Selection Card */}
        <div className="card bg-white mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="almacen" className="block text-sm font-semibold text-[#64748B] mb-2">
                Seleccionar Almacén
              </label>
              <select
                id="almacen"
                value={almacenSeleccionado}
                onChange={(e) => setAlmacenSeleccionado(e.target.value)}
                className="input-field"
              >
                <option value="">Seleccionar almacén...</option>
                {almacenes.map((almacen) => (
                  <option key={almacen.id} value={almacen.id}>
                    {almacen.nombre} {almacen.ubicacion ? `- ${almacen.ubicacion}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {almacenSeleccionado && almacenActual && (
              <div className="flex-1 bg-[#F9FAFB] rounded-lg p-4">
                <p className="text-sm font-medium text-[#64748B] mb-1">Ubicación</p>
                <p className="text-lg font-['Montserrat'] font-semibold text-[#1F2937]">
                  {almacenActual.ubicacion || 'Sin ubicación especificada'}
                </p>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="card bg-white">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
              <p className="ml-4 text-[#64748B]">Cargando inventario...</p>
            </div>
          </div>
        ) : !almacenSeleccionado ? (
          <div className="card bg-white">
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-[#CBD5E1] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-[#64748B] text-lg">Selecciona un almacén para ver su inventario</p>
            </div>
          </div>
        ) : inventario.length === 0 ? (
          <div className="card bg-white">
            <div className="text-center py-12">
              <svg className="mx-auto h-16 w-16 text-[#CBD5E1] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-[#64748B] text-lg">No hay productos en este almacén</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="card bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#64748B] text-sm font-medium">Total Productos</p>
                    <p className="text-3xl font-['Montserrat'] font-bold text-[#1F2937] mt-1">
                      {inventario.length}
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
                    <p className="text-3xl font-['Montserrat'] font-bold text-[#1F2937] mt-1">
                      {totalUnidades}
                    </p>
                  </div>
                  <div className="bg-green-100 rounded-full p-3">
                    <svg className="w-8 h-8 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="card bg-gradient-to-br from-[#10B981] to-[#059669] text-white">
                <p className="text-green-100 text-sm font-medium mb-1">Almacén Actual</p>
                <p className="text-2xl font-['Montserrat'] font-bold">
                  {almacenActual?.nombre}
                </p>
              </div>

              <div className="card bg-gradient-to-br from-[#2563EB] to-[#1E3A8A] text-white">
                <p className="text-blue-100 text-sm font-medium mb-1">Estado</p>
                <p className="text-2xl font-['Montserrat'] font-bold">
                  Activo ✓
                </p>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="card bg-white">
              <h3 className="text-2xl font-['Montserrat'] font-bold text-[#1F2937] mb-6">
                Productos en Stock
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header border-b-2 border-[#E5E7EB]">
                      <th className="text-left py-4 px-4">Código</th>
                      <th className="text-left py-4 px-4">Producto</th>
                      <th className="text-left py-4 px-4">Tipo</th>
                      <th className="text-right py-4 px-4">Cantidad</th>
                      <th className="text-left py-4 px-4">Unidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventario.map((item) => (
                      <tr key={item.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-mono font-semibold text-[#2563EB] bg-blue-50 px-3 py-1 rounded">
                            {item.producto.codigo}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-medium text-[#1F2937]">
                            {item.producto.nombre}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {getTipoBadge(item.producto.tipo)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-2xl font-['Montserrat'] font-bold text-[#1F2937]">
                            {item.cantidad}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-[#64748B] text-sm">
                            {item.producto.unidadMedida}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Info Banner */}
        {inventario.length > 0 && (
          <div className="mt-6 bg-blue-50 border-l-4 border-[#2563EB] p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-[#2563EB]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Inventario actualizado.</span> Los datos reflejan el stock actual en tiempo real.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
