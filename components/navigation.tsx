'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard, ArrowUpFromLine, Inbox, Boxes, History,
  Package, LogOut, Users, Warehouse, Settings, X, Menu, ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import NotificationsBell from './notifications-bell';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/salida', label: 'Registrar Salida', icon: ArrowUpFromLine },
  { href: '/recepciones', label: 'Recepciones', icon: Inbox },
  { href: '/inventario', label: 'Inventario', icon: Boxes },
  { href: '/mis-movimientos', label: 'Mis Movimientos', icon: History },
  { href: '/historial', label: 'Historial', icon: ClipboardList },
];

const ADMIN_NAV = [
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { href: '/admin/almacenes', label: 'Almacenes', icon: Warehouse },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/ajustes', label: 'Ajustes', icon: Settings },
];

const BOTTOM_5 = [
  { href: '/', label: 'Inicio', icon: LayoutDashboard },
  { href: '/inventario', label: 'Stock', icon: Boxes },
  { href: '/salida', label: 'Salida', icon: ArrowUpFromLine },
  { href: '/recepciones', label: 'Recibir', icon: Inbox },
  { href: '/historial', label: 'Historial', icon: ClipboardList },
];

export default function Navigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();

  const role = (session?.user as any)?.rol || 'operador';
  const userName = session?.user?.name || 'Usuario';
  const almacenNombre = (session?.user as any)?.almacenNombre || '';
  const initials = userName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link key={href} href={href} onClick={onClose} className={cn('nav-item', active && 'active')}>
            <Icon className={cn('h-[18px] w-[18px] flex-shrink-0', active && 'stroke-[2.5]')} />
            <span>{label}</span>
          </Link>
        );
      })}

      {role === 'admin' && (
        <>
          <div className="pt-3 pb-1.5 px-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Admin</p>
          </div>
          {ADMIN_NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} onClick={onClose} className={cn('nav-item', active && 'active')}>
                <Icon className={cn('h-[18px] w-[18px] flex-shrink-0', active && 'stroke-[2.5]')} />
                <span>{label}</span>
              </Link>
            );
          })}
        </>
      )}
    </nav>
  );

  return (
    <>
      {/* ═══ SIDEBAR (desktop) ═══ */}
      <aside className="sidebar">
        <SidebarContent />

        {/* ── User footer ── */}
        <div className="px-3 py-3 border-t" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-muted/40 transition-colors">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{userName}</p>
              <p className="text-[10px] text-muted-foreground capitalize">
                {role}{almacenNombre ? ` · ${almacenNombre}` : ''}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex-shrink-0"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ═══ TOPBAR ═══ */}
      <header className="topbar justify-between">
        {/* Left */}
        <div className="flex items-center gap-3">
          {/* Hamburger mobile */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted/60 transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-none text-foreground">Control de Inventario</p>
              {almacenNombre && (
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{almacenNombre}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <NotificationsBell onOpenRecepciones={() => {
            setMenuOpen(false);
            window.dispatchEvent(new CustomEvent('open-recepciones'));
          }} />

          {/* User chip */}
          <div className="flex items-center gap-2 rounded-xl bg-muted/50 border border-border/50 px-2.5 py-1.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm flex-shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-xs font-semibold text-foreground">{userName}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{role}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="hidden sm:flex p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] flex lg:hidden animate-fade-in" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-72 h-full bg-card shadow-2xl flex flex-col animate-fade-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Header menú */}
            <div
              className="flex items-center gap-3 px-4 py-4"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1d4ed8)' }}
            >
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{userName}</p>
                <p className="text-xs text-blue-200 capitalize">
                  {role}{almacenNombre ? ` · ${almacenNombre}` : ''}
                </p>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <SidebarContent onClose={() => setMenuOpen(false)} />

            <div className="p-3 border-t" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="nav-item w-full text-red-500 hover:bg-red-50"
              >
                <LogOut className="w-[18px] h-[18px]" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ BOTTOM NAV (mobile) ═══ */}
      <nav className="bottom-nav">
        {BOTTOM_5.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} className={cn('bottom-nav-item', active && 'active')}>
              <div className="bn-icon-wrap">
                <Icon className={cn('w-[18px] h-[18px]', active && 'stroke-[2.5]')} />
              </div>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
