'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/navigation';

interface Stats {
  totalProductos: number;
  totalInventario: number;
  almacenes: number;
  movimientosPendientes: number;
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({
    totalProductos: 4,
    totalInventario: 930,
    almacenes: 3,
    movimientosPendientes: 0
  });

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] rounded-2xl shadow-xl p-8 mb-8 text-white">
          <h1 className="text-4xl font-['Montserrat'] font-bold mb-3">
            Sistema de Gestión de Inventario
          </h1>
          <p className="text-blue-100 text-lg">
            Control profesional de movimientos y stock entre almacenes
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card bg-white hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#64748B] text-sm font-medium">Total Productos</p>
                <p className="text-3xl font-['Montserrat'] font-bold text-[#1F2937] mt-1">
                  {stats.totalProductos}
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
                <p className="text-3xl font-['Montserrat'] font-bold text-[#1F2937] mt-1">
                  {stats.totalInventario}
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
                <p className="text-[#64748B] text-sm font-medium">Almacenes</p>
                <p className="text-3xl font-['Montserrat'] font-bold text-[#1F2937] mt-1">
                  {stats.almacenes}
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
                <p className="text-[#64748B] text-sm font-medium">Pendientes</p>
                <p className="text-3xl font-['Montserrat'] font-bold text-[#1F2937] mt-1">
                  {stats.movimientosPendientes}
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

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="card bg-white">
            <h2 className="text-xl font-['Montserrat'] font-semibold text-[#1F2937] mb-4">
              Acciones Rápidas
            </h2>
            <div className="space-y-3">
              <a href="/salida" className="block p-4 bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-lg transition-colors">
                <div className="flex items-center">
                  <span className="text-2xl mr-3 flex-shrink-0">📤</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[#1F2937]">Registrar Salida</p>
                    <p className="text-sm text-[#64748B] mt-1">Enviar productos a otro almacén</p>
                  </div>
                </div>
              </a>
              <a href="/recepciones" className="block p-4 bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-lg transition-colors">
                <div className="flex items-center">
                  <span className="text-2xl mr-3 flex-shrink-0">📥</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[#1F2937]">Aprobar Recepciones</p>
                    <p className="text-sm text-[#64748B] mt-1">Confirmar llegada de productos</p>
                  </div>
                </div>
              </a>
              <a href="/inventario" className="block p-4 bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-lg transition-colors">
                <div className="flex items-center">
                  <span className="text-2xl mr-3 flex-shrink-0">📦</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[#1F2937]">Ver Inventario</p>
                    <p className="text-sm text-[#64748B] mt-1">Consultar stock por almacén</p>
                  </div>
                </div>
              </a>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-[#10B981] to-[#059669] text-white">
            <h3 className="text-xl font-['Montserrat'] font-semibold mb-4">
              Guía Rápida
            </h3>
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p 
                  className="font-semibold mb-2"
                  style={{
                    color: 'var(--color-gray-800)',
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                    textAlign: 'left',
                    backgroundColor: 'white'
                  }}
                >
                  1️⃣ Selecciona tu usuario
                </p>
                <p 
                  className="text-sm"
                  style={{ color: 'var(--color-gray-800)' }}
                >
                  Usa el selector arriba para indicar desde qué almacén trabajas
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p 
                  className="font-semibold mb-2"
                  style={{
                    color: 'var(--color-gray-800)',
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                    textAlign: 'left',
                    backgroundColor: 'white'
                  }}
                >
                  2️⃣ Registra movimientos
                </p>
                <p 
                  className="text-sm"
                  style={{ color: 'var(--color-gray-800)' }}
                >
                  Envía productos especificando tipo y cantidad
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p 
                  className="font-semibold mb-2"
                  style={{
                    color: 'var(--color-gray-800)',
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                    textAlign: 'left',
                    backgroundColor: 'white'
                  }}
                >
                  3️⃣ Aprueba recepciones
                </p>
                <p 
                  className="text-sm"
                  style={{ color: 'var(--color-gray-800)' }}
                >
                  Confirma la llegada de productos a tu almacén
                </p>
              </div>
            </div>
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
                <span className="font-semibold">Sistema configurado correctamente.</span> Tienes 930 unidades distribuidas en 3 almacenes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
