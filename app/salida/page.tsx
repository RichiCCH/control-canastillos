'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/navigation';
import { generarPDFSalida } from '@/lib/utils/pdf';

interface Almacen {
  id: number;
  nombre: string;
}

interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  unidadMedida: string;
}

interface ProductoSeleccionado {
  productoId: number;
  producto: Producto;
  cantidad: number;
}

export default function SalidaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [almacenDestinoId, setAlmacenDestinoId] = useState('');
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoSeleccionado[]>([]);
  const [productoActual, setProductoActual] = useState('');
  const [cantidadActual, setCantidadActual] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAlmacenes();
      fetchProductos();
    }
  }, [status]);

  const fetchAlmacenes = async () => {
    try {
      const response = await fetch('/api/almacenes');
      const data = await response.json();
      setAlmacenes(data);
    } catch (error) {
      console.error('Error al cargar almacenes:', error);
    }
  };

  const fetchProductos = async () => {
    try {
      const response = await fetch('/api/productos');
      const data = await response.json();
      setProductos(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const agregarProducto = () => {
    if (!productoActual || !cantidadActual) {
      setMessage({ type: 'error', text: 'Selecciona un producto y cantidad' });
      return;
    }

    const cantidad = parseInt(cantidadActual);
    if (cantidad <= 0) {
      setMessage({ type: 'error', text: 'La cantidad debe ser mayor a 0' });
      return;
    }

    const producto = productos.find(p => p.id === parseInt(productoActual));
    if (!producto) return;

    // Check if product already exists in selection
    const yaExiste = productosSeleccionados.find(p => p.productoId === producto.id);
    if (yaExiste) {
      setMessage({ type: 'error', text: 'Este producto ya está agregado. Puedes editarlo en la lista.' });
      return;
    }

    setProductosSeleccionados([
      ...productosSeleccionados,
      { productoId: producto.id, producto, cantidad }
    ]);

    setProductoActual('');
    setCantidadActual('');
    setMessage(null);
  };

  const eliminarProducto = (productoId: number) => {
    setProductosSeleccionados(productosSeleccionados.filter(p => p.productoId !== productoId));
  };

  const actualizarCantidad = (productoId: number, cantidad: number) => {
    if (cantidad <= 0) return;
    setProductosSeleccionados(
      productosSeleccionados.map(p =>
        p.productoId === productoId ? { ...p, cantidad } : p
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!session?.user?.id) {
      setMessage({ type: 'error', text: 'No estás autenticado' });
      return;
    }

    const userId = parseInt(session.user.id);
    if (isNaN(userId)) {
      setMessage({ type: 'error', text: 'ID de usuario inválido' });
      return;
    }

    if (!almacenDestinoId) {
      setMessage({ type: 'error', text: 'Por favor selecciona un almacén de destino' });
      return;
    }

    if (productosSeleccionados.length === 0) {
      setMessage({ type: 'error', text: 'Debes agregar al menos un producto' });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          almacenDestinoId: parseInt(almacenDestinoId),
          usuarioSolicitanteId: userId,
          observaciones: observaciones || null,
          detalles: productosSeleccionados.map(p => ({
            productoId: p.productoId,
            cantidad: p.cantidad
          }))
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear movimiento');
      }

      setMessage({
        type: 'success',
        text: `Movimiento creado exitosamente con ${productosSeleccionados.length} productos`,
      });

      // Obtener información completa del usuario y almacenes para el PDF
      const usersResponse = await fetch('/api/users');
      const users = await usersResponse.json();
      const usuario = users.find((u: { id: number }) => u.id === userId);
      
      const almacenOrigen = almacenes.find(a => a.id === usuario?.almacenId);
      const almacenDestino = almacenes.find(a => a.id === parseInt(almacenDestinoId));

      // Generar PDF de salida
      if (almacenOrigen && almacenDestino && usuario) {
        generarPDFSalida({
          id: data.movimiento.id,
          fechaSolicitud: data.movimiento.fechaSolicitud || new Date().toISOString(),
          almacenOrigen: {
            id: almacenOrigen.id,
            nombre: almacenOrigen.nombre,
          },
          almacenDestino: {
            id: almacenDestino.id,
            nombre: almacenDestino.nombre,
          },
          usuarioSolicitante: {
            id: usuario.id,
            nombre: usuario.nombre,
          },
          observaciones: observaciones || null,
          detalles: productosSeleccionados.map(p => ({
            codigo: p.producto.codigo,
            nombre: p.producto.nombre,
            tipo: p.producto.tipo,
            cantidad: p.cantidad,
            unidadMedida: p.producto.unidadMedida,
          })),
        });
      }

      // Limpiar formulario
      setAlmacenDestinoId('');
      setProductosSeleccionados([]);
      setObservaciones('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const getTipoIcon = (tipo: string) => {
    const icons: Record<string, string> = {
      canastillo_negro: '⬛',
      canastillo_color: '🎨',
      cooler: '❄️',
      caja: '📦',
    };
    return icons[tipo] || '📦';
  };

  const totalProductos = productosSeleccionados.length;
  const totalUnidades = productosSeleccionados.reduce((sum, p) => sum + p.cantidad, 0);

  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] rounded-2xl shadow-xl p-8 mb-8 text-white">
          <h1 className="text-4xl font-['Montserrat'] font-bold mb-3">
            Registrar Salida de Productos
          </h1>
          <p className="text-blue-100 text-lg">
            Envía productos de tu almacén a otro destino
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form Section - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card bg-white">
              <h2 className="text-2xl font-['Montserrat'] font-semibold text-[#1F2937] mb-6">
                Datos del Movimiento
              </h2>

              {message && (
                <div
                  className={`mb-6 p-4 rounded-lg ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="almacenDestino" className="block text-sm font-semibold text-[#64748B] mb-2">
                    Almacén de Destino
                  </label>
                  <select
                    id="almacenDestino"
                    value={almacenDestinoId}
                    onChange={(e) => setAlmacenDestinoId(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Seleccionar almacén...</option>
                    {almacenes.map((almacen) => (
                      <option key={almacen.id} value={almacen.id}>
                        {almacen.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-[#E5E7EB] pt-6">
                  <h3 className="text-lg font-['Montserrat'] font-semibold text-[#1F2937] mb-4">
                    Agregar Productos
                  </h3>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label htmlFor="producto" className="block text-sm font-semibold text-[#64748B] mb-2">
                        Producto
                      </label>
                      <select
                        id="producto"
                        value={productoActual}
                        onChange={(e) => setProductoActual(e.target.value)}
                        className="input-field"
                      >
                        <option value="">Seleccionar producto...</option>
                        {productos.map((producto) => (
                          <option key={producto.id} value={producto.id}>
                            {getTipoIcon(producto.tipo)} {producto.nombre} ({producto.codigo})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="cantidad" className="block text-sm font-semibold text-[#64748B] mb-2">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        id="cantidad"
                        value={cantidadActual}
                        onChange={(e) => setCantidadActual(e.target.value)}
                        min="1"
                        placeholder="0"
                        className="input-field"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={agregarProducto}
                    className="mt-4 bg-[#10B981] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#059669] transition-colors"
                  >
                    + Agregar Producto
                  </button>
                </div>

                <div>
                  <label htmlFor="observaciones" className="block text-sm font-semibold text-[#64748B] mb-2">
                    Observaciones (Opcional)
                  </label>
                  <textarea
                    id="observaciones"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    rows={3}
                    placeholder="Notas adicionales sobre este envío..."
                    className="input-field"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || productosSeleccionados.length === 0}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Procesando...' : 'Registrar Salida'}
                </button>
              </form>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border-l-4 border-[#2563EB] p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Información:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Los productos deben estar en tu almacén actual</li>
                <li>• El movimiento quedará pendiente hasta que el destino lo apruebe</li>
                <li>• Puedes agregar múltiples productos en un solo movimiento</li>
              </ul>
            </div>
          </div>

          {/* Products List - Right Side */}
          <div className="lg:col-span-1">
            <div className="card bg-white sticky top-24">
              <h3 className="text-xl font-['Montserrat'] font-semibold text-[#1F2937] mb-4">
                Resumen del Movimiento
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#F3F4F6] rounded-lg p-3">
                  <p className="text-xs text-[#64748B] mb-1">Productos</p>
                  <p className="text-2xl font-['Montserrat'] font-bold text-[#1F2937]">
                    {totalProductos}
                  </p>
                </div>
                <div className="bg-[#F3F4F6] rounded-lg p-3">
                  <p className="text-xs text-[#64748B] mb-1">Unidades</p>
                  <p className="text-2xl font-['Montserrat'] font-bold text-[#10B981]">
                    {totalUnidades}
                  </p>
                </div>
              </div>

              {productosSeleccionados.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-[#CBD5E1] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-sm text-[#64748B]">
                    No hay productos agregados
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {productosSeleccionados.map((item) => (
                    <div
                      key={item.productoId}
                      className="bg-[#F9FAFB] rounded-lg p-3 border border-[#E5E7EB]"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-[#1F2937] text-sm">
                            {getTipoIcon(item.producto.tipo)} {item.producto.nombre}
                          </p>
                          <p className="text-xs text-[#64748B] font-mono">
                            {item.producto.codigo}
                          </p>
                        </div>
                        <button
                          onClick={() => eliminarProducto(item.productoId)}
                          className="text-red-500 hover:text-red-700 ml-2"
                          title="Eliminar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-[#64748B]">Cantidad:</label>
                        <input
                          type="number"
                          value={item.cantidad}
                          onChange={(e) => actualizarCantidad(item.productoId, parseInt(e.target.value))}
                          min="1"
                          className="w-20 px-2 py-1 border border-[#E5E7EB] rounded text-sm font-semibold text-[#1F2937]"
                        />
                        <span className="text-xs text-[#64748B]">
                          {item.producto.unidadMedida}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
