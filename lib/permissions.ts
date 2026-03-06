// Sistema de permisos basado en roles

export type Role = 'admin' | 'encargado' | 'supervisor' | 'operador';

export type Permission =
  | 'admin.users.view'
  | 'admin.users.create'
  | 'admin.users.edit'
  | 'admin.users.delete'
  | 'admin.almacenes.view'
  | 'admin.almacenes.create'
  | 'admin.almacenes.edit'
  | 'admin.almacenes.delete'
  | 'admin.productos.view'
  | 'admin.productos.create'
  | 'admin.productos.edit'
  | 'admin.productos.delete'
  | 'admin.ajustes.view'
  | 'admin.ajustes.create'
  | 'movimientos.create'
  | 'movimientos.approve'
  | 'movimientos.reject'
  | 'movimientos.edit'
  | 'movimientos.delete'
  | 'movimientos.view_all'
  | 'inventario.view'
  | 'inventario.view_all'
  | 'historial.view'
  | 'historial.view_all';

// Definición de permisos por rol
const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    'admin.users.view',
    'admin.users.create',
    'admin.users.edit',
    'admin.users.delete',
    'admin.almacenes.view',
    'admin.almacenes.create',
    'admin.almacenes.edit',
    'admin.almacenes.delete',
    'admin.productos.view',
    'admin.productos.create',
    'admin.productos.edit',
    'admin.productos.delete',
    'admin.ajustes.view',
    'admin.ajustes.create',
    'movimientos.create',
    'movimientos.approve',
    'movimientos.reject',
    'movimientos.edit',
    'movimientos.delete',
    'movimientos.view_all',
    'inventario.view',
    'inventario.view_all',
    'historial.view',
    'historial.view_all',
  ],

  // ENCARGADO DE ÁREA: supervisa múltiples almacenes asignados.
  // Puede hacer todo dentro de sus almacenes: crear, aprobar, rechazar, ver historial e inventario.
  // No puede acceder al panel de administración global (usuarios, almacenes, ajustes del sistema).
  encargado: [
    'movimientos.create',
    'movimientos.approve',
    'movimientos.reject',
    'movimientos.edit',
    'movimientos.view_all',
    'inventario.view',
    'inventario.view_all',
    'historial.view',
    'historial.view_all',
  ],

  supervisor: [
    'movimientos.create',
    'movimientos.approve',
    'movimientos.reject',
    'movimientos.view_all',
    'inventario.view',
    'inventario.view_all',
    'historial.view',
    'historial.view_all',
  ],

  operador: [
    'movimientos.create',
    'movimientos.approve',
    'movimientos.reject',
    'inventario.view',
    'historial.view',
  ],
};

/**
 * Verifica si un rol tiene un permiso específico
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) || false;
}

/**
 * Verifica si un rol tiene todos los permisos especificados
 */
export function hasAllPermissions(
  role: Role,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Verifica si un rol tiene al menos uno de los permisos especificados
 */
export function hasAnyPermission(
  role: Role,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Obtiene todos los permisos de un rol
 */
export function getRolePermissions(role: Role): Permission[] {
  return rolePermissions[role] || [];
}

/**
 * Verifica si un usuario puede acceder a una ruta de administración global
 */
export function canAccessAdmin(role: Role): boolean {
  return hasPermission(role, 'admin.users.view');
}

/**
 * Verifica si un usuario puede aprobar movimientos
 */
export function canApproveMovements(role: Role): boolean {
  return hasPermission(role, 'movimientos.approve');
}

/**
 * Verifica si un usuario puede ver todos los movimientos
 */
export function canViewAllMovements(role: Role): boolean {
  return hasPermission(role, 'movimientos.view_all');
}

/**
 * Verifica si un usuario puede editar/eliminar movimientos
 */
export function canManageMovements(role: Role): boolean {
  return hasAnyPermission(role, ['movimientos.edit', 'movimientos.delete']);
}

/**
 * Retorna la etiqueta legible del rol
 */
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Administrador',
    encargado: 'Encargado de Área',
    supervisor: 'Supervisor',
    operador: 'Operador',
  };
  return labels[role] || role;
}

/**
 * Retorna el color del badge del rol
 */
export function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    admin: 'bg-red-100 text-red-800',
    encargado: 'bg-purple-100 text-purple-800',
    supervisor: 'bg-blue-100 text-blue-800',
    operador: 'bg-green-100 text-green-800',
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}
