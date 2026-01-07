'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/navigation';

interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  descripcion: string | null;
  unidadMedida: string;
  precioBase: string | null;
  stockMinimo: number;
  activo: number;
  createdAt: string;
}

export default function AdminProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    tipo: 'canastillo_negro' as 'canastillo_negro' | 'canastillo_color' | 'cooler' | 'caja',
    descripcion: '',
    unidadMedida: 'unidad',
    precioBase: '',
    stockMinimo: '0',
  });

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    try {
      const response = await fetch('/api/admin/productos');
      const data = await response.json();
      setProductos(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      showMessage('Error al cargar productos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleOpenModal = (producto?: Producto) => {
    if (producto) {
      setEditingProducto(producto);
      setFormData({
        codigo: producto.codigo,
        nombre: producto.nombre,
        tipo: producto.tipo as any,
        descripcion: producto.descripcion || '',
        unidadMedida: producto.unidadMedida,
        precioBase: producto.precioBase || '',
        stockMinimo: producto.stockMinimo.toString(),
      });
    } else {
      setEditingProducto(null);
      setFormData({
        codigo: '',
        nombre: '',
        tipo: 'canastillo_negro',
        descripcion: '',
        unidadMedida: 'unidad',
        precioBase: '',
        stockMinimo: '0',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProducto(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingProducto
        ? `/api/admin/productos/${editingProducto.id}`
        : '/api/admin/productos';
      const method = editingProducto ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: formData.codigo,
          nombre: formData.nombre,
          tipo: formData.tipo,
          descripcion: formData.descripcion || null,
          unidadMedida: formData.unidadMedida,
          precioBase: formData.precioBase || null,
          stockMinimo: parseInt(formData.stockMinimo) || 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar producto');
      }

      showMessage(
        editingProducto ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente',
        'success'
      );
      handleCloseModal();
      fetchProductos();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showMessage(errorMessage, 'error');
    }
  };

  const handleToggleActivo = async (producto: Producto) => {
    try {
      const response = await fetch(`/api/admin/productos/${producto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activo: producto.activo === 1 ? 0 : 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar estado del producto');
      }

      showMessage(
        producto.activo === 1 ? 'Producto desactivado' : 'Producto activado',
        'success'
      );
      fetchProductos();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showMessage(errorMessage, 'error');
    }
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
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[tipo] || 'bg-gray-100 text-gray-800'}`}>
        {labels[tipo] || tipo}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#e8e8e8' }}>
        <Navigation />
        {/* Spacer for fixed navigation */}
        <div className="h-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8">
          <div className="card bg-white">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
              <p className="ml-4 text-[#64748B]">Cargando productos...</p>
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
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-['Playfair_Display'] font-bold text-[#1F2937] mb-2">
              Administración de Productos
            </h1>
            <p className="text-sm sm:text-base text-[#64748B]">
              Gestiona el catálogo de productos del sistema
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-[#2563EB] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#1E40AF] transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Producto
          </button>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card bg-white">
            <div className="text-[#64748B] text-sm font-medium mb-1">Total Productos</div>
            <div className="text-3xl font-bold text-[#1F2937]">{productos.length}</div>
          </div>
          <div className="card bg-white">
            <div className="text-[#64748B] text-sm font-medium mb-1">Productos Activos</div>
            <div className="text-3xl font-bold text-green-600">
              {productos.filter((p) => p.activo === 1).length}
            </div>
          </div>
          <div className="card bg-white">
            <div className="text-[#64748B] text-sm font-medium mb-1">Productos Inactivos</div>
            <div className="text-3xl font-bold text-gray-600">
              {productos.filter((p) => p.activo === 0).length}
            </div>
          </div>
          <div className="card bg-white">
            <div className="text-[#64748B] text-sm font-medium mb-1">Tipos de Producto</div>
            <div className="text-3xl font-bold text-blue-600">
              {new Set(productos.map(p => p.tipo)).size}
            </div>
          </div>
        </div>

        {/* Productos Table */}
        <div className="card bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Mínimo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productos.map((producto) => (
                  <tr key={producto.id} className={producto.activo === 0 ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{producto.codigo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{producto.nombre}</div>
                      <div className="text-sm text-gray-500">ID: {producto.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTipoBadge(producto.tipo)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{producto.unidadMedida}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{producto.stockMinimo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          producto.activo === 1
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {producto.activo === 1 ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleOpenModal(producto)}
                        className="text-[#2563EB] hover:text-[#1E40AF] mr-4"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleActivo(producto)}
                        className={
                          producto.activo === 1
                            ? 'text-red-600 hover:text-red-800'
                            : 'text-green-600 hover:text-green-800'
                        }
                      >
                        {producto.activo === 1 ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">
                {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código *
                    </label>
                    <input
                      type="text"
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo *
                    </label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="canastillo_negro">Canastillo Negro</option>
                      <option value="canastillo_color">Canastillo Color</option>
                      <option value="cooler">Cooler</option>
                      <option value="caja">Caja</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                    placeholder="Información adicional sobre el producto..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unidad de Medida
                    </label>
                    <input
                      type="text"
                      value={formData.unidadMedida}
                      onChange={(e) => setFormData({ ...formData, unidadMedida: e.target.value })}
                      placeholder="unidad"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio Base
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.precioBase}
                      onChange={(e) => setFormData({ ...formData, precioBase: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Mínimo
                    </label>
                    <input
                      type="number"
                      value={formData.stockMinimo}
                      onChange={(e) => setFormData({ ...formData, stockMinimo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1E40AF]"
                  >
                    {editingProducto ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
