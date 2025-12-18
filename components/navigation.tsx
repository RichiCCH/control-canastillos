'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

export default function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();

  const userRole = (session?.user as any)?.rol || 'operador';
  const userName = session?.user?.name || 'Usuario';
  const userAlmacen = (session?.user as any)?.almacenId;

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
    <nav className="bg-[#1E3A8A] shadow-lg fixed w-full top-0 z-50">
      <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-20 gap-2">
          {/* Logo y nombre */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="bg-[#10B981] rounded-lg p-2">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1
                className="text-white font-['Montserrat'] text-base sm:text-lg font-semibold tracking-tight leading-tight whitespace-nowrap"
                style={{ color: 'var(--background)' }}
              >
                Control de Inventario
              </h1>
              <p className="text-blue-200 text-[10px] sm:text-xs leading-tight whitespace-nowrap hidden sm:block">Sistema de Gestión</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2 xl:px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1 xl:gap-2 whitespace-nowrap ${
                  pathname === link.href
                    ? 'bg-[#2563EB] text-white shadow-md'
                    : 'text-blue-100 hover:bg-[#2563EB] hover:text-white'
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
                className={`px-2 xl:px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-1 xl:gap-2 whitespace-nowrap ${
                  pathname === link.href
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-red-200 hover:bg-red-600 hover:text-white'
                }`}
              >
                <span className="text-base">{link.icon}</span>
                <span className="font-medium text-xs xl:text-sm">{link.label}</span>
              </Link>
            ))}
          </div>

          {/* User Info & Logout */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-blue-100 text-xs xl:text-sm">
                <svg className="w-4 h-4 xl:w-5 xl:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium">Usuario:</span>
              </div>
              <div className="bg-[#2563EB] text-white px-3 py-2 rounded-lg text-sm font-medium border-2 border-blue-400">
                {userName}
              </div>
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

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-white p-2 hover:bg-[#2563EB] rounded-lg transition-colors"
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

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="lg:hidden bg-[#1E3A8A] border-t border-blue-700">
          <div className="px-3 py-3 space-y-1.5">
            {/* User info in mobile */}
            <div className="bg-[#2563EB] text-white px-4 py-3 rounded-lg mb-2">
              <div className="flex items-center gap-2 mb-2">
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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
                  pathname === link.href
                    ? 'bg-[#2563EB] text-white shadow-md'
                    : 'text-blue-100 hover:bg-[#2563EB] hover:text-white'
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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors border border-red-400 ${
                  pathname === link.href
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-red-200 hover:bg-red-600 hover:text-white'
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
