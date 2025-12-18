'use client';

import { useEffect, useState } from 'react';
import { Role, hasPermission, Permission } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: Permission;
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({
  children,
  permission,
  fallback,
}: ProtectedRouteProps) {
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('selectedUserId');
    if (userId) {
      fetchUserRole(parseInt(userId));
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserRole = async (userId: number) => {
    try {
      const response = await fetch('/api/users');
      const users = await response.json();
      const user = users.find((u: { id: number }) => u.id === userId);

      if (user) {
        setUserRole(user.rol as Role);
      }
    } catch (error) {
      console.error('Error al obtener rol del usuario:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
        <p className="ml-4 text-[#64748B]">Verificando permisos...</p>
      </div>
    );
  }

  // Si no se requiere permiso específico, mostrar contenido
  if (!permission) {
    return <>{children}</>;
  }

  // Si no hay usuario o rol, mostrar fallback
  if (!userRole) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800 font-medium">
          Debes seleccionar un usuario para acceder a esta sección
        </p>
      </div>
    );
  }

  // Verificar si tiene el permiso requerido
  if (!hasPermission(userRole, permission)) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">
          No tienes permisos para acceder a esta sección
        </p>
        <p className="text-red-600 text-sm mt-2">
          Rol actual: <span className="font-semibold">{userRole}</span>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
