// Server-side authentication and authorization utilities
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { Role, hasPermission, Permission } from './permissions';
import { auth } from './auth-config';

export interface AuthUser {
  id: number;
  nombre: string;
  rol: Role;
  almacenId: number | null;
}

/**
 * Get authenticated user from NextAuth session
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return null;
    }

    const userId = parseInt(session.user.id);

    const result = await db
      .select({
        id: users.id,
        nombre: users.nombre,
        rol: users.rol,
        almacenId: users.almacenId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (result.length === 0) return null;

    return {
      id: result[0].id,
      nombre: result[0].nombre,
      rol: (result[0].rol || 'operador') as Role,
      almacenId: result[0].almacenId,
    };
  } catch (error) {
    console.error('Error getting auth user:', error);
    return null;
  }
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(request?: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser();

  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  return user;
}

/**
 * Require specific permission - throws error if not authorized
 */
export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<AuthUser> {
  const user = await requireAuth();

  if (!hasPermission(user.rol, permission)) {
    throw new Error('FORBIDDEN');
  }

  return user;
}

/**
 * Check if user owns a resource (created by them)
 */
export function isOwner(user: AuthUser, resourceUserId: number): boolean {
  return user.id === resourceUserId;
}

/**
 * Require user to be owner or have specific permission
 */
export function requireOwnerOrPermission(
  user: AuthUser,
  resourceUserId: number,
  permission: Permission
): boolean {
  if (isOwner(user, resourceUserId)) return true;
  return hasPermission(user.rol, permission);
}

/**
 * Create error response for unauthorized access
 */
export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({
      error: 'No autenticado. Por favor selecciona un usuario válido.'
    }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Create error response for forbidden access
 */
export function forbiddenResponse(message?: string) {
  return new Response(
    JSON.stringify({
      error: message || 'No tienes permisos para realizar esta acción.'
    }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  );
}

// Client-side helpers
export function getCurrentUserId(): number | null {
  if (typeof window === 'undefined') return null;
  const userId = localStorage.getItem('selectedUserId');
  return userId ? parseInt(userId) : null;
}

/**
 * Client-side authenticated fetch wrapper
 * Automatically adds x-user-id header from localStorage
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const userId = getCurrentUserId();

  const headers = new Headers(options.headers || {});

  // Add user ID header if available
  if (userId) {
    headers.set('x-user-id', userId.toString());
  }

  // Add content-type if not set and body exists
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
