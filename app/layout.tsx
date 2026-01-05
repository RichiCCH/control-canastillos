import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

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
        <SessionProvider>
          <div className="flex-grow">
            {children}
          </div>

          <footer className="bg-slate-900 text-slate-300 mt-auto border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                {/* Columna 1: Brand */}
                <div className="col-span-1 md:col-span-2 space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">I</span>
                    </div>
                    <h3 className="text-white font-bold text-xl tracking-tight">
                      Control de Inventario
                    </h3>
                  </div>
                  <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
                    Plataforma integral para la gestión eficiente, trazabilidad y control de stock entre sucursales. Optimiza tu logística hoy.
                  </p>
                  <div className="flex space-x-5 pt-2">
                    <SocialIcon path="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    <SocialIcon path="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    <SocialIcon path="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </div>
                </div>

                {/* Columna 2: Navegación */}
                <div>
                  <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider text-slate-200">Plataforma</h4>
                  <ul className="space-y-3 text-sm">
                    <li><FooterLink href="/" text="Dashboard" /></li>
                    <li><FooterLink href="/inventario" text="Inventario General" /></li>
                    <li><FooterLink href="/salida" text="Movimientos" /></li>
                    <li><FooterLink href="/recepciones" text="Recepciones" /></li>
                  </ul>
                </div>

                {/* Columna 3: Legal */}
                <div>
                  <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider text-slate-200">Soporte</h4>
                  <ul className="space-y-3 text-sm">
                    <li><FooterLink href="#" text="Documentación" /></li>
                    <li><FooterLink href="#" text="Ayuda y Soporte" /></li>
                    <li><FooterLink href="#" text="Política de Privacidad" /></li>
                    <li><FooterLink href="#" text="Términos de Servicio" /></li>
                  </ul>
                </div>
              </div>

              {/* Copyright */}
              <div className="border-t border-slate-800 mt-12 pt-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center">
                <p className="text-sm text-slate-500">
                  © {new Date().getFullYear()} Control de Inventario. Todos los derechos reservados.
                </p>
                <div className="flex space-x-6 mt-4 md:mt-0">
                  <span className="text-xs text-slate-600 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Estado: Operativo
                  </span>
                </div>
              </div>
            </div>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}

function SocialIcon({ path }: { path: string }) {
  return (
    <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d={path} />
      </svg>
    </a>
  );
}

function FooterLink({ href, text }: { href: string, text: string }) {
  return (
    <a href={href} className="text-slate-400 hover:text-blue-400 transition-colors duration-200 block hover:translate-x-1 transform">
      {text}
    </a>
  );
}
