'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/navigation';

interface Almacen {
  id: number;
  nombre: string;
  ubicacion: string | null;
  descripcion: string | null;
  activo: number;
  usuariosAsignados?: number;
  createdAt: string;
}

export default function AdminAlmacenesPage() {
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAlmacen, setEditingAlmacen] = useState<Almacen | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    ubicacion: '',
    descripcion: '',
  });

  useEffect(() => {
    fetchAlmacenes();
  }, []);

  const fetchAlmacenes = async () => {
    try {
      const response = await fetch('/api/admin/almacenes');
      const data = await response.json();
      setAlmacenes(data);
    } catch (error) {
      console.error('Error al cargar almacenes:', error);
      showMessage('Error al cargar almacenes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleOpenModal = (almacen?: Almacen) => {
    if (almacen) {
      setEditingAlmacen(almacen);
      setFormData({
        nombre: almacen.nombre,
        ubicacion: almacen.ubicacion || '',
        descripcion: almacen.descripcion || '',
      });
    } else {
      setEditingAlmacen(null);
      setFormData({
        nombre: '',
        ubicacion: '',
        descripcion: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAlmacen(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingAlmacen
        ? `/api/admin/almacenes/${editingAlmacen.id}`
        : '/api/admin/almacenes';
      const method = editingAlmacen ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre,
          ubicacion: formData.ubicacion || null,
          descripcion: formData.descripcion || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar almacén');
      }

      showMessage(
        editingAlmacen ? 'Almacén actualizado exitosamente' : 'Almacén creado exitosamente',
        'success'
      );
      handleCloseModal();
      fetchAlmacenes();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showMessage(errorMessage, 'error');
    }
  };

  const handleToggleActivo = async (almacen: Almacen) => {
    // Confirmar si hay usuarios asignados
    if (almacen.activo === 1 && almacen.usuariosAsignados && almacen.usuariosAsignados > 0) {
      if (!confirm(`Este almacén tiene ${almacen.usuariosAsignados} usuario(s) asignado(s). ¿Estás seguro de que quieres desactivarlo?`)) {
        return;
      }
    }

    try {
      const response = await fetch(`/api/admin/almacenes/${almacen.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activo: almacen.activo === 1 ? 0 : 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar estado del almacén');
      }

      showMessage(
        almacen.activo === 1 ? 'Almacén desactivado' : 'Almacén activado',
        'success'
      );
      fetchAlmacenes();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showMessage(errorMessage, 'error');
    }
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
              <p className="ml-4 text-[#64748B]">Cargando almacenes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalUsuariosAsignados = almacenes.reduce((sum, a) => sum + (a.usuariosAsignados || 0), 0);

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
              Administración de Almacenes
            </h1>
            <p className="text-sm sm:text-base text-[#64748B]">
              Gestiona almacenes y ubicaciones del sistema
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-[#2563EB] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#1E40AF] transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Almacén
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
            <div className="text-[#64748B] text-sm font-medium mb-1">Total Almacenes</div>
            <div className="text-3xl font-bold text-[#1F2937]">{almacenes.length}</div>
          </div>
          <div className="card bg-white">
            <div className="text-[#64748B] text-sm font-medium mb-1">Almacenes Activos</div>
            <div className="text-3xl font-bold text-green-600">
              {almacenes.filter((a) => a.activo === 1).length}
            </div>
          </div>
          <div className="card bg-white">
            <div className="text-[#64748B] text-sm font-medium mb-1">Almacenes Inactivos</div>
            <div className="text-3xl font-bold text-gray-600">
              {almacenes.filter((a) => a.activo === 0).length}
            </div>
          </div>
          <div className="card bg-white">
            <div className="text-[#64748B] text-sm font-medium mb-1">Usuarios Asignados</div>
            <div className="text-3xl font-bold text-blue-600">
              {totalUsuariosAsignados}
            </div>
          </div>
        </div>

        {/* Almacenes Table */}
        <div className="card bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Almacén
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuarios
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
                {almacenes.map((almacen) => (
                  <tr key={almacen.id} className={almacen.activo === 0 ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{almacen.nombre}</div>
                      <div className="text-sm text-gray-500">ID: {almacen.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {almacen.ubicacion || (
                          <span className="text-gray-400 italic">Sin ubicación</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {almacen.descripcion || (
                          <span className="text-gray-400 italic">Sin descripción</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {almacen.usuariosAsignados || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          almacen.activo === 1
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {almacen.activo === 1 ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleOpenModal(almacen)}
                        className="text-[#2563EB] hover:text-[#1E40AF] mr-4"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleActivo(almacen)}
                        className={
                          almacen.activo === 1
                            ? 'text-red-600 hover:text-red-800'
                            : 'text-green-600 hover:text-green-800'
                        }
                      >
                        {almacen.activo === 1 ? 'Desactivar' : 'Activar'}
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
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingAlmacen ? 'Editar Almacén' : 'Nuevo Almacén'}
              </h2>

              <form onSubmit={handleSubmit}>
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
                    Ubicación
                  </label>
                  <input
                    type="text"
                    value={formData.ubicacion}
                    onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                    placeholder="Ej: Edificio A, Piso 2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                    placeholder="Información adicional sobre el almacén..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
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
                    {editingAlmacen ? 'Actualizar' : 'Crear'}
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
