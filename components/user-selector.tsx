'use client';

import { useEffect, useState } from 'react';

interface User {
  id: number;
  nombre: string;
  almacenId: number | null;
  almacen?: {
    id: number;
    nombre: string;
  };
}

export default function UserSelector() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    // Cargar usuario guardado del localStorage
    const savedUserId = localStorage.getItem('selectedUserId');
    if (savedUserId) {
      setSelectedUserId(parseInt(savedUserId));
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserChange = (userId: string) => {
    const id = parseInt(userId);
    setSelectedUserId(id);
    localStorage.setItem('selectedUserId', userId);
    // Recargar la página para aplicar el cambio
    window.location.reload();
  };

  const currentUser = users.find(u => u.id === selectedUserId);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-gray-500">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex items-center gap-4">
        <label htmlFor="user-select" className="font-semibold text-gray-700">
          Usuario Actual:
        </label>
        <select
          id="user-select"
          value={selectedUserId || ''}
          onChange={(e) => handleUserChange(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="" style={{ color: 'var(--background)' }}>
            Seleccionar usuario...
          </option>
          {users.map((user) => (
            <option key={user.id} value={user.id} style={{ color: 'var(--background)' }}>
              {user.nombre} {user.almacen ? `- ${user.almacen.nombre}` : '(Sin almacén)'}
            </option>
          ))}
        </select>
      </div>
      {currentUser && currentUser.almacen && (
        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Almacén:</span> {currentUser.almacen.nombre}
          </p>
        </div>
      )}
      {selectedUserId && !currentUser?.almacen && (
        <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-800">
            Este usuario no tiene un almacén asignado
          </p>
        </div>
      )}
    </div>
  );
}
