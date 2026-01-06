import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Control de Inventario - Sistema de Gestión",
  description: "Sistema profesional de gestión de inventario y movimientos entre almacenes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="antialiased min-h-screen flex flex-col bg-gray-50 h-full font-sans">
        <Providers>
          <div className="flex-grow">
            {children}
          </div>

          <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-300 mt-auto border-t border-slate-700/50 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                {/* Columna 1: Brand */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <img
                      src="/logo.png"
                      alt="Control de Inventario"
                      className="w-12 h-12 object-contain filter drop-shadow-lg"
                    />
                    <div>
                      <h3 className="text-white font-bold text-xl tracking-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                        Control de Inventario
                      </h3>
                      <p className="text-xs text-blue-300/80 font-medium">
                        Optimiza tu logística
                      </p>
                    </div>
                  </div>
                </div>

                {/* Columna 2: Navegación */}
                <div>
                  <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Plataforma
                  </h4>
                  <ul className="space-y-2.5 text-sm">
                    <li><FooterLink href="/" text="Dashboard" /></li>
                    <li><FooterLink href="/inventario" text="Inventario General" /></li>
                    <li><FooterLink href="/salida" text="Movimientos" /></li>
                    <li><FooterLink href="/recepciones" text="Recepciones" /></li>
                  </ul>
                </div>

                {/* Columna 3: Estado */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Estado del Sistema
                    </h4>
                    <div className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <span className="text-xs text-emerald-400 font-semibold">Operativo</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Copyright */}
              <div className="border-t border-slate-700/50 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-xs text-slate-400">
                  © {new Date().getFullYear()} <span className="text-white font-semibold">Control de Inventario</span>. Todos los derechos reservados.
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Versión 1.0.0</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                  <span>Hecho con ❤️</span>
                </div>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}

function FooterLink({ href, text }: { href: string, text: string }) {
  return (
    <a href={href} className="group flex items-center gap-2 text-slate-400 hover:text-blue-300 transition-all duration-200">
      <svg className="w-3 h-3 text-blue-500/50 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      <span className="group-hover:translate-x-0.5 transition-transform">{text}</span>
    </a>
  );
}
