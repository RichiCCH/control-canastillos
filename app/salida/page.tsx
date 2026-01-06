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
  const [transportadoPor, setTransportadoPor] = useState('');
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoSeleccionado[]>([]);
  const [productoActual, setProductoActual] = useState('');
  const [cantidadActual, setCantidadActual] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [stockDisponible, setStockDisponible] = useState<number | null>(null);

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

  // Fetch stock when product is selected in modal
  useEffect(() => {
    const fetchStock = async () => {
      if (!productoActual || !session?.user?.id) {
        setStockDisponible(null);
        return;
      }

      try {
        const userAlmacenId = (session.user as any)?.almacenId;
        if (!userAlmacenId) {
          setStockDisponible(null);
          return;
        }

        const response = await fetch(`/api/inventario?almacenId=${userAlmacenId}&productoId=${productoActual}`);
        const data = await response.json();

        if (response.ok && data.length > 0) {
          setStockDisponible(data[0].cantidad);
        } else {
          setStockDisponible(0);
        }
      } catch (error) {
        console.error('Error al obtener stock:', error);
        setStockDisponible(null);
      }
    };

    fetchStock();
  }, [productoActual, session]);

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
    setShowModal(false); // Close modal after adding
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
          transportadoPor: transportadoPor || null,
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
          estado: 'pendiente',
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
          transportadoPor: transportadoPor || null,
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
      setTransportadoPor('');
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
    <div className="min-h-screen" style={{ backgroundColor: '#e8e8e8' }}>
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] rounded-2xl shadow-xl p-8 mb-8 text-white">
          <h1 className="text-4xl font-['Playfair_Display'] font-bold mb-3">
            Registrar Salida de Productos
          </h1>
          <p className="text-blue-100 text-lg">
            Envía productos de tu almacén a otro destino
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="card bg-white">
            <h2 className="text-2xl font-['Playfair_Display'] font-bold text-[#1F2937] mb-6">
              Datos del Movimiento
            </h2>

            {message && (
              <div
                className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
              >
                {message.type === 'success' ? (
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="font-medium">{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Almacén de Destino */}
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
                  {almacenes
                    .filter(almacen => almacen.id !== (session?.user as any)?.almacenId)
                    .map((almacen) => (
                      <option key={almacen.id} value={almacen.id}>
                        {almacen.nombre}
                      </option>
                    ))}
                </select>
              </div>

              {/* 2. Transportado Por */}
              <div>
                <label htmlFor="transportadoPor" className="block text-sm font-semibold text-[#64748B] mb-2">
                  Transportado Por (Opcional)
                </label>
                <input
                  type="text"
                  id="transportadoPor"
                  value={transportadoPor}
                  onChange={(e) => setTransportadoPor(e.target.value)}
                  placeholder="Nombre del transportista o empresa..."
                  className="input-field"
                />
              </div>

              {/* 3. Observaciones */}
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

              {/* 4. Botón para Agregar Productos */}
              <div className="border-t border-[#E5E7EB] pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white px-6 py-4 rounded-xl font-bold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Agregar Producto
                </button>
              </div>

              {/* Modal para Agregar Productos */}
              {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                    {/* Close button */}
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>

                    <h3 className="text-2xl font-['Playfair_Display'] font-bold text-[#1F2937] mb-6 flex items-center gap-2">
                      <svg className="w-6 h-6 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Agregar Producto
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="producto-modal" className="block text-sm font-bold text-[#1F2937] mb-2">
                          Seleccionar Producto
                        </label>
                        <select
                          id="producto-modal"
                          value={productoActual}
                          onChange={(e) => setProductoActual(e.target.value)}
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all text-[#1F2937] font-medium"
                        >
                          <option value="">Seleccionar producto...</option>
                          {productos.map((producto) => (
                            <option key={producto.id} value={producto.id}>
                              {getTipoIcon(producto.tipo)} {producto.nombre} ({producto.codigo})
                            </option>
                          ))}
                        </select>

                        {/* Stock disponible */}
                        {productoActual && (
                          <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              <span className="text-sm font-semibold text-blue-900">
                                Stock disponible:
                                {stockDisponible === null ? (
                                  <span className="ml-1 text-gray-500">Cargando...</span>
                                ) : stockDisponible === 0 ? (
                                  <span className="ml-1 text-red-600 font-bold">Sin stock</span>
                                ) : (
                                  <span className="ml-1 text-green-600 font-bold">{stockDisponible} unidades</span>
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label htmlFor="cantidad-modal" className="block text-sm font-bold text-[#1F2937] mb-2">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          id="cantidad-modal"
                          value={cantidadActual}
                          onChange={(e) => setCantidadActual(e.target.value)}
                          min="1"
                          placeholder="0"
                          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all text-[#1F2937] font-bold text-lg"
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowModal(false)}
                          className="flex-1 px-4 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={agregarProducto}
                          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white px-4 py-3 rounded-xl font-bold transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Lista de Productos */}
              <div className="border-t border-[#E5E7EB] pt-6">
                <h3 className="text-lg font-['Playfair_Display'] font-bold text-[#1F2937] mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Lista de Productos ({totalProductos} productos, {totalUnidades} unidades)
                </h3>

                {productosSeleccionados.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <svg className="mx-auto h-16 w-16 text-[#CBD5E1] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-[#64748B] text-lg font-medium">
                      No hay productos agregados
                    </p>
                    <p className="text-[#94A3B8] text-sm mt-2">
                      Usa el formulario de arriba para agregar productos
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-100 border-b-2 border-slate-300">
                          <th className="text-left py-3 px-4 font-bold text-[#1F2937] text-sm">Producto</th>
                          <th className="text-left py-3 px-4 font-bold text-[#1F2937] text-sm">Código</th>
                          <th className="text-center py-3 px-4 font-bold text-[#1F2937] text-sm">Cantidad</th>
                          <th className="text-center py-3 px-4 font-bold text-[#1F2937] text-sm w-20">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productosSeleccionados.map((item, index) => (
                          <tr
                            key={item.productoId}
                            className={`border-b border-slate-200 hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{getTipoIcon(item.producto.tipo)}</span>
                                <span className="font-medium text-[#1F2937]">{item.producto.nombre}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-sm text-[#64748B] bg-gray-100 px-2 py-1 rounded">
                                {item.producto.codigo}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <input
                                  type="number"
                                  value={item.cantidad}
                                  onChange={(e) => actualizarCantidad(item.productoId, parseInt(e.target.value))}
                                  min="1"
                                  className="w-20 px-2 py-1 border-2 border-slate-300 rounded-lg text-center font-bold text-[#1F2937] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] focus:outline-none"
                                />
                                <span className="text-sm text-[#64748B]">{item.producto.unidadMedida}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => eliminarProducto(item.productoId)}
                                className="text-red-500 hover:text-white hover:bg-red-500 p-2 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || productosSeleccionados.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#2563EB] to-[#1E3A8A] hover:from-[#1E40AF] hover:to-[#1E3A8A] text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-105 mt-6"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Registrar Salida
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div >
    </div >
  );
}
