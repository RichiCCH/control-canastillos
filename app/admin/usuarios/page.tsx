'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/navigation';

interface Almacen {
  id: number;
  nombre: string;
}

interface User {
  id: number;
  nombre: string;
  email: string | null;
  rol: 'admin' | 'supervisor' | 'operador';
  activo: number;
  almacenId: number | null;
  almacen?: {
    id: number;
    nombre: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'operador' as 'admin' | 'supervisor' | 'operador',
    almacenId: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchAlmacenes();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      showMessage('Error al cargar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlmacenes = async () => {
    try {
      const response = await fetch('/api/almacenes');
      const data = await response.json();
      setAlmacenes(data);
    } catch (error) {
      console.error('Error al cargar almacenes:', error);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        nombre: user.nombre,
        email: user.email || '',
        password: '',
        rol: user.rol,
        almacenId: user.almacenId?.toString() || '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        nombre: '',
        email: '',
        password: '',
        rol: 'operador',
        almacenId: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users';
      const method = editingUser ? 'PATCH' : 'POST';

      // Preparar el body
      const bodyData: any = {
        nombre: formData.nombre,
        email: formData.email || null,
        rol: formData.rol,
        almacenId: formData.almacenId ? parseInt(formData.almacenId) : null,
      };

      // Solo incluir password si se proporcionó
      if (formData.password && formData.password.trim() !== '') {
        bodyData.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar usuario');
      }

      showMessage(
        editingUser ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente',
        'success'
      );
      handleCloseModal();
      fetchUsers();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showMessage(errorMessage, 'error');
    }
  };

  const handleToggleActivo = async (user: User) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activo: user.activo === 1 ? 0 : 1,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al cambiar estado del usuario');
      }

      showMessage(
        user.activo === 1 ? 'Usuario desactivado' : 'Usuario activado',
        'success'
      );
      fetchUsers();
    } catch (error) {
      showMessage('Error al cambiar estado del usuario', 'error');
    }
  };

  const getRolBadge = (rol: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      supervisor: 'bg-blue-100 text-blue-800',
      operador: 'bg-green-100 text-green-800',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[rol]}`}>
        {rol.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="main-content" style={{ background: "var(--bg)" }}>
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 lg:pb-8">
          <div className="card bg-white">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
              <p className="ml-4 text-[#64748B]">Cargando usuarios...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content" style={{ background: "var(--bg)" }}>
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 lg:pb-8">
        {/* Header Section */}
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-['Playfair_Display'] font-bold text-[#1F2937] mb-2">
              Administración de Usuarios
            </h1>
            <p className="text-sm sm:text-base text-[#64748B]">
              Gestiona usuarios, roles y permisos del sistema
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-[#2563EB] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#1E40AF] transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Usuario
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
            <div className="text-[#64748B] text-sm font-medium mb-1">Total Usuarios</div>
            <div className="text-3xl font-bold text-[#1F2937]">{users.length}</div>
          </div>
          <div className="card bg-white">
            <div className="text-[#64748B] text-sm font-medium mb-1">Administradores</div>
            <div className="text-3xl font-bold text-red-600">
              {users.filter((u) => u.rol === 'admin').length}
            </div>
          </div>
          <div className="card bg-white">
            <div className="text-[#64748B] text-sm font-medium mb-1">Supervisores</div>
            <div className="text-3xl font-bold text-blue-600">
              {users.filter((u) => u.rol === 'supervisor').length}
            </div>
          </div>
          <div className="card bg-white">
            <div className="text-[#64748B] text-sm font-medium mb-1">Activos</div>
            <div className="text-3xl font-bold text-green-600">
              {users.filter((u) => u.activo === 1).length}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="card bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Almacén
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className={user.activo === 0 ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.nombre}</div>
                      <div className="text-xs text-gray-500 sm:hidden">{user.email || '-'}</div>
                      <div className="text-xs text-gray-500 md:hidden">{user.almacen?.nombre || <span className="italic">Sin asignar</span>}</div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{getRolBadge(user.rol)}</td>
                    <td className="hidden md:table-cell px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.almacen?.nombre || (
                          <span className="text-gray-400 italic">Sin asignar</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          user.activo === 1
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.activo === 1 ? 'ACTIVO' : 'INACT.'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="text-[#2563EB] hover:text-[#1E40AF] py-1"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleActivo(user)}
                          className={`py-1 ${
                            user.activo === 1
                              ? 'text-red-600 hover:text-red-800'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {user.activo === 1 ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
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
            <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
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
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña {editingUser ? '(dejar vacío para no cambiar)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    placeholder={editingUser ? 'Ingresa nueva contraseña (opcional)' : 'Ingresa contraseña'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol *
                  </label>
                  <select
                    value={formData.rol}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rol: e.target.value as 'admin' | 'supervisor' | 'operador',
                      })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="operador">Operador</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Almacén
                  </label>
                  <select
                    value={formData.almacenId}
                    onChange={(e) => setFormData({ ...formData, almacenId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sin asignar</option>
                    {almacenes.map((almacen) => (
                      <option key={almacen.id} value={almacen.id}>
                        {almacen.nombre}
                      </option>
                    ))}
                  </select>
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
                    {editingUser ? 'Actualizar' : 'Crear'}
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
