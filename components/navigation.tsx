'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import NotificationsBell from './notifications-bell';

export default function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();

  const userRole = (session?.user as any)?.rol || 'operador';
  const userName = session?.user?.name || 'Usuario';
  const userAlmacen = (session?.user as any)?.almacenId;
  const almacenNombre = (session?.user as any)?.almacenNombre;

  const links = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/inventario', label: 'Inventario', icon: '📦' },
    { href: '/salida', label: 'Registrar Salida', icon: '📤' },
    { href: '/recepciones', label: 'Recepciones', icon: '📥' },
    { href: '/mis-movimientos', label: 'Mis Movimientos', icon: '📋' },
    { href: '/historial', label: 'Historial', icon: '📜' },
  ];

  const adminLinks = [
    { href: '/admin/usuarios', label: 'Administrar Usuarios', icon: '👥' },
  ];

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <nav className="bg-gray-100 shadow-sm border-b border-gray-300 fixed w-full top-0 z-50">
      <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-20 gap-2">
          {/* Logo y nombre */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex-shrink-0">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-10 h-10 object-contain"
              />
            </div>
            <div>
              <h1
                className="text-gray-900 font-['Montserrat'] text-base sm:text-lg font-semibold tracking-tight leading-tight whitespace-nowrap"
                style={{ color: '#1F2937' }}
              >
                Control de Inventario
              </h1>
              <p className="text-gray-600 text-[10px] sm:text-xs leading-tight whitespace-nowrap hidden sm:block">Sistema de Gestión</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2 xl:px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1 xl:gap-2 whitespace-nowrap ${pathname === link.href
                  ? 'bg-[#2563EB] text-white shadow-md'
                  : 'text-gray-700 hover:bg-[#2563EB] hover:text-white'
                  }`}
              >
                <span className="text-base">{link.icon}</span>
                <span className="font-medium text-xs xl:text-sm">{link.label}</span>
              </Link>
            ))}
            {userRole === 'admin' && adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2 xl:px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1 xl:gap-2 whitespace-nowrap ${pathname === link.href
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-red-600 hover:bg-red-600 hover:text-white'
                  }`}
              >
                <span className="text-base">{link.icon}</span>
                <span className="font-medium text-xs xl:text-sm">{link.label}</span>
              </Link>
            ))}
          </div>

          {/* User Info & Logout */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            {/* Campana de notificaciones */}
            <NotificationsBell />

            <div className="flex flex-col items-end mr-4">
              <span className="font-bold text-gray-800 text-sm leading-tight">
                {userName}
              </span>
              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
                {userRole} {userAlmacen ? `| ${almacenNombre || 'Almacén ' + userAlmacen}` : ''}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Salir</span>
            </button>
          </div>

          {/* Mobile: Notification bell and menu button */}
          <div className="flex lg:hidden items-center gap-2">
            <NotificationsBell />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="lg:hidden bg-gray-100 border-t border-gray-300">
          <div className="px-3 py-3 space-y-1.5">
            {/* User info in mobile */}
            <div className="bg-[#2563EB] text-white px-4 py-3 rounded-lg mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-semibold">{userName}</span>
              </div>
            </div>

            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${pathname === link.href
                  ? 'bg-[#2563EB] text-white shadow-md'
                  : 'text-gray-700 hover:bg-[#2563EB] hover:text-white'
                  }`}
              >
                <span className="text-base">{link.icon}</span>
                <span className="font-medium text-sm">{link.label}</span>
              </Link>
            ))}
            {userRole === 'admin' && adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors border border-red-400 ${pathname === link.href
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-red-600 hover:bg-red-600 hover:text-white'
                  }`}
              >
                <span className="text-base">{link.icon}</span>
                <span className="font-medium text-sm">{link.label}</span>
              </Link>
            ))}

            {/* Logout button in mobile */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors mt-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
