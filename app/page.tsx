'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/navigation';
import { useSession } from 'next-auth/react';

interface AdminStats {
  role: 'admin';
  totalProductos: number;
  totalInventario: number;
  almacenes: number;
  movimientosPendientes: number;
}

interface OperatorStats {
  role: 'operator';
  pendingReceptions: number;
  productosEnStock: number;
  pendingSent: number;
}

type Stats = AdminStats | OperatorStats;

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    const fetchStats = async () => {
      try {
        const userRole = (session?.user as any)?.rol || 'operador';
        const userAlmacenId = (session?.user as any)?.almacenId;

        // Si es operador, envía almacenId; si es admin, no envía parámetros
        const url = userRole === 'admin'
          ? '/api/stats'
          : `/api/stats?almacenId=${userAlmacenId}`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [session, status, router]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#e8e8e8' }}>
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] rounded-2xl shadow-xl p-8 mb-8 text-white">
          <h1 className="text-4xl font-['Playfair_Display'] font-bold mb-3">
            {stats?.role === 'admin' ? 'Panel de Control Global' : `Mi Almacén - ${(session?.user as any)?.almacenNombre || ''}`}
          </h1>
          <p className="text-blue-100 text-lg">
            {stats?.role === 'admin'
              ? 'Control profesional de todo el sistema de inventarios'
              : 'Control de tu almacén y movimientos de inventario'
            }
          </p>
        </div>

        {/* Stats Cards */}
        {stats?.role === 'admin' ? (
          // Admin: 4 KPIs globales
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card bg-white hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#64748B] text-sm font-medium">Total Productos</p>
                  <p className="text-3xl font-['Playfair_Display'] font-bold text-[#1F2937] mt-1">
                    {loading ? '...' : stats.totalProductos}
                  </p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card bg-white hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#64748B] text-sm font-medium">Total Unidades</p>
                  <p className="text-3xl font-['Playfair_Display'] font-bold text-[#1F2937] mt-1">
                    {loading ? '...' : stats.totalInventario}
                  </p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card bg-white hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#64748B] text-sm font-medium">Almacenes Totales</p>
                  <p className="text-3xl font-['Playfair_Display'] font-bold text-[#1F2937] mt-1">
                    {loading ? '...' : stats.almacenes}
                  </p>
                </div>
                <div className="bg-yellow-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card bg-white hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#64748B] text-sm font-medium">Pendientes Globales</p>
                  <p className="text-3xl font-['Playfair_Display'] font-bold text-[#1F2937] mt-1">
                    {loading ? '...' : stats.movimientosPendientes}
                  </p>
                </div>
                <div className="bg-purple-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Operador: 3 KPIs específicos
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card bg-white hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#64748B] text-sm font-medium">Recepciones Pendientes</p>
                  <p className="text-3xl font-['Playfair_Display'] font-bold text-[#1F2937] mt-1">
                    {loading ? '...' : (stats as OperatorStats).pendingReceptions}
                  </p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card bg-white hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#64748B] text-sm font-medium">Productos en Stock</p>
                  <p className="text-3xl font-['Playfair_Display'] font-bold text-[#1F2937] mt-1">
                    {loading ? '...' : (stats as OperatorStats).productosEnStock}
                  </p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="card bg-white hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#64748B] text-sm font-medium">Solicitudes Enviadas</p>
                  <p className="text-3xl font-['Playfair_Display'] font-bold text-[#1F2937] mt-1">
                    {loading ? '...' : (stats as OperatorStats).pendingSent}
                  </p>
                </div>
                <div className="bg-purple-100 rounded-full p-3">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="card bg-white mb-8">
          <h2 className="text-xl font-['Playfair_Display'] font-semibold text-[#1F2937] mb-6">
            Acciones Rápidas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="/salida" className="group block p-6 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-[#2563EB] hover:to-[#1E3A8A] rounded-xl transition-all duration-300 border border-blue-200 hover:border-[#2563EB] hover:shadow-lg">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                  <svg className="w-8 h-8 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <p className="font-bold text-[#1F2937] text-lg mb-2 group-hover:text-white transition-colors">Registrar Salida</p>
                <p className="text-sm text-[#64748B] group-hover:text-blue-100 transition-colors">Enviar productos a otro almacén</p>
              </div>
            </a>

            <a href="/recepciones" className="group block p-6 bg-gradient-to-br from-green-50 to-green-100 hover:from-[#10B981] hover:to-[#059669] rounded-xl transition-all duration-300 border border-green-200 hover:border-[#10B981] hover:shadow-lg">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                  <svg className="w-8 h-8 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="font-bold text-[#1F2937] text-lg mb-2 group-hover:text-white transition-colors">Aprobar Recepciones</p>
                <p className="text-sm text-[#64748B] group-hover:text-green-100 transition-colors">Confirmar llegada de productos</p>
              </div>
            </a>

            <a href="/inventario" className="group block p-6 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-600 hover:to-purple-700 rounded-xl transition-all duration-300 border border-purple-200 hover:border-purple-600 hover:shadow-lg">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="font-bold text-[#1F2937] text-lg mb-2 group-hover:text-white transition-colors">Ver Inventario</p>
                <p className="text-sm text-[#64748B] group-hover:text-purple-100 transition-colors">Consultar stock disponible</p>
              </div>
            </a>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border-l-4 border-[#2563EB] p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-[#2563EB]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                {loading ? (
                  'Cargando datos del sistema...'
                ) : stats?.role === 'admin' ? (
                  <><span className="font-semibold">Sistema configurado correctamente.</span> {(stats as AdminStats).totalInventario} unidades en {(stats as AdminStats).almacenes} almacenes.</>
                ) : (
                  <><span className="font-semibold">Sistema sincronizado.</span> {(stats as OperatorStats).productosEnStock} productos en stock en {(session?.user as any)?.almacenNombre}.</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
