// Sistema de permisos basado en roles

export type Role = 'admin' | 'supervisor' | 'operador';

export type Permission =
  | 'admin.users.view'
  | 'admin.users.create'
  | 'admin.users.edit'
  | 'admin.users.delete'
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
 * Verifica si un usuario puede acceder a una ruta de administración
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
