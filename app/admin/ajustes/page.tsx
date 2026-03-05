'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/navigation';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { generarPDFReconteo } from '@/lib/utils/pdf';

interface Almacen {
  id: number;
  nombre: string;
}

interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  tipo: string;
}

interface ProductoAjuste {
  productoId: number;
  cantidad: number;
  nombreProducto?: string;
}

interface ProductoReconteo {
  productoId: number;
  codigo: string;
  nombre: string;
  tipo: string;
  stockActual: number;
  stockFisico: number;
  diferencia: number;
}

interface Ajuste {
  id: number;
  tipoMovimiento: 'entrada' | 'baja';
  motivo: string;
  proveedorResponsable: string | null;
  observaciones: string | null;
  almacenId: number;
  almacenNombre: string | null;
  fechaSolicitud: string;
  detalles: {
    id: number;
    productoId: number;
    cantidad: number;
    nombreProducto: string;
    codigoProducto: string;
    tipoProducto: string;
  }[];
}

const MOTIVOS_ENTRADA = [
  'Compra',
  'Devolución de cliente',
  'Ajuste de inventario',
  'Stock encontrado',
  'Otro',
];

const MOTIVOS_BAJA = [
  'Baja por daño',
  'Pérdida',
  'Merma',
  'Robo',
  'Vencimiento',
  'Otro',
];

export default function AjustesInventarioPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showReconteoModal, setShowReconteoModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados para reconteo
  const [almacenReconteo, setAlmacenReconteo] = useState('');
  const [productosReconteo, setProductosReconteo] = useState<ProductoReconteo[]>([]);
  const [loadingInventario, setLoadingInventario] = useState(false);
  const [motivoReconteo, setMotivoReconteo] = useState('Reconteo físico');
  const [observacionesReconteo, setObservacionesReconteo] = useState('');

  const [formData, setFormData] = useState({
    tipoMovimiento: 'entrada' as 'entrada' | 'baja',
    motivo: '',
    proveedorResponsable: '',
    observaciones: '',
    almacenId: '',
  });

  const [productosAjuste, setProductosAjuste] = useState<ProductoAjuste[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidadProducto, setCantidadProducto] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      const userRole = (session?.user as any)?.rol;
      if (userRole !== 'admin') {
        router.push('/');
      } else {
        fetchAjustes();
        fetchAlmacenes();
        fetchProductos();
      }
    }
  }, [status, session, router]);

  const fetchAjustes = async () => {
    try {
      const response = await fetch('/api/admin/ajustes');
      if (response.ok) {
        const data = await response.json();
        setAjustes(data);
      }
    } catch (error) {
      console.error('Error al cargar ajustes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlmacenes = async () => {
    try {
      const response = await fetch('/api/admin/almacenes');
      if (response.ok) {
        const data = await response.json();
        setAlmacenes(data);
      }
    } catch (error) {
      console.error('Error al cargar almacenes:', error);
    }
  };

  const fetchProductos = async () => {
    try {
      const response = await fetch('/api/productos');
      if (response.ok) {
        const data = await response.json();
        setProductos(data);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleOpenModal = () => {
    setFormData({
      tipoMovimiento: 'entrada',
      motivo: '',
      proveedorResponsable: '',
      observaciones: '',
      almacenId: '',
    });
    setProductosAjuste([]);
    setProductoSeleccionado('');
    setCantidadProducto('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleAgregarProducto = () => {
    if (!productoSeleccionado || !cantidadProducto || parseInt(cantidadProducto) <= 0) {
      showMessage('Selecciona un producto y una cantidad válida', 'error');
      return;
    }

    const producto = productos.find((p) => p.id === parseInt(productoSeleccionado));
    if (!producto) return;

    // Verificar si ya está agregado
    if (productosAjuste.find((p) => p.productoId === producto.id)) {
      showMessage('Este producto ya está agregado', 'error');
      return;
    }

    setProductosAjuste([
      ...productosAjuste,
      {
        productoId: producto.id,
        cantidad: parseInt(cantidadProducto),
        nombreProducto: producto.nombre,
      },
    ]);

    setProductoSeleccionado('');
    setCantidadProducto('');
  };

  const handleEliminarProducto = (productoId: number) => {
    setProductosAjuste(productosAjuste.filter((p) => p.productoId !== productoId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.almacenId) {
      showMessage('Debes seleccionar un almacén', 'error');
      return;
    }

    if (!formData.motivo) {
      showMessage('Debes seleccionar un motivo', 'error');
      return;
    }

    if (productosAjuste.length === 0) {
      showMessage('Debes agregar al menos un producto', 'error');
      return;
    }

    try {
      const response = await fetch('/api/admin/ajustes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          almacenId: parseInt(formData.almacenId),
          productos: productosAjuste,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage(data.message || 'Ajuste registrado exitosamente', 'success');
        setShowModal(false);
        fetchAjustes();
      } else {
        showMessage(data.error || 'Error al registrar ajuste', 'error');
      }
    } catch (error) {
      showMessage('Error al registrar ajuste', 'error');
    }
  };

  // Handler para cargar inventario completo de un almacén para reconteo
  const handleCargarInventario = async () => {
    if (!almacenReconteo) {
      showMessage('Debe seleccionar un almacén', 'error');
      return;
    }

    setLoadingInventario(true);
    try {
      const response = await fetch(
        `/api/admin/inventario-almacen?almacenId=${almacenReconteo}`
      );

      if (!response.ok) {
        throw new Error('Error al cargar inventario');
      }

      const data = await response.json();

      // Inicializar productos con stockFisico = stockActual y diferencia = 0
      const productosConReconteo: ProductoReconteo[] = data.map((p: any) => ({
        productoId: p.productoId,
        codigo: p.codigo,
        nombre: p.nombre,
        tipo: p.tipo,
        stockActual: p.stockActual,
        stockFisico: p.stockActual,
        diferencia: 0,
      }));

      setProductosReconteo(productosConReconteo);
      showMessage(`Inventario cargado: ${productosConReconteo.length} productos`, 'success');
    } catch (error) {
      console.error('Error al cargar inventario:', error);
      showMessage('Error al cargar inventario del almacén', 'error');
    } finally {
      setLoadingInventario(false);
    }
  };

  // Handler para actualizar stock físico y calcular diferencia
  const handleStockFisicoChange = (productoId: number, nuevoStockFisico: number) => {
    setProductosReconteo((prev) =>
      prev.map((p) =>
        p.productoId === productoId
          ? {
              ...p,
              stockFisico: nuevoStockFisico,
              diferencia: nuevoStockFisico - p.stockActual,
            }
          : p
      )
    );
  };

  // Handler para procesar reconteo y crear ajustes
  const handleSubmitReconteo = async () => {
    if (!almacenReconteo) {
      showMessage('Debe seleccionar un almacén', 'error');
      return;
    }

    // Filtrar solo productos con diferencia != 0
    const productosConDiferencia = productosReconteo.filter((p) => p.diferencia !== 0);

    if (productosConDiferencia.length === 0) {
      showMessage('No hay diferencias para ajustar', 'error');
      return;
    }

    // Separar en entradas y bajas
    const entradas = productosConDiferencia.filter((p) => p.diferencia > 0);
    const bajas = productosConDiferencia.filter((p) => p.diferencia < 0);

    try {
      // Crear ajuste de entrada si hay productos con diferencia positiva
      if (entradas.length > 0) {
        const responseEntrada = await fetch('/api/admin/ajustes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipoMovimiento: 'entrada',
            motivo: motivoReconteo,
            observaciones: observacionesReconteo || null,
            almacenId: parseInt(almacenReconteo),
            productos: entradas.map((p) => ({
              productoId: p.productoId,
              cantidad: p.diferencia,
            })),
          }),
        });

        if (!responseEntrada.ok) {
          const errorData = await responseEntrada.json();
          throw new Error(errorData.error || 'Error al procesar entradas');
        }
      }

      // Crear ajuste de baja si hay productos con diferencia negativa
      if (bajas.length > 0) {
        const responseBaja = await fetch('/api/admin/ajustes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipoMovimiento: 'baja',
            motivo: motivoReconteo,
            observaciones: observacionesReconteo || null,
            almacenId: parseInt(almacenReconteo),
            productos: bajas.map((p) => ({
              productoId: p.productoId,
              cantidad: Math.abs(p.diferencia),
            })),
          }),
        });

        if (!responseBaja.ok) {
          const errorData = await responseBaja.json();
          throw new Error(errorData.error || 'Error al procesar bajas');
        }
      }

      // Generar PDF automáticamente después de procesar ajustes exitosamente
      try {
        const almacen = almacenes.find((a) => a.id === parseInt(almacenReconteo));
        if (almacen) {
          const reconteoPDF = {
            almacenNombre: almacen.nombre,
            motivo: motivoReconteo,
            observaciones: observacionesReconteo || undefined,
            fecha: new Date(),
            usuarioNombre: session?.user?.name || 'Usuario',
            productos: productosReconteo,
          };
          generarPDFReconteo(reconteoPDF);
        }
      } catch (pdfError) {
        console.error('Error al generar PDF:', pdfError);
        // No bloqueamos el flujo si falla el PDF
      }

      showMessage(
        `Reconteo completado: ${entradas.length} entradas, ${bajas.length} bajas. PDF generado.`,
        'success'
      );

      // Cerrar modal y limpiar
      setShowReconteoModal(false);
      setAlmacenReconteo('');
      setProductosReconteo([]);
      setMotivoReconteo('Reconteo físico');
      setObservacionesReconteo('');

      // Recargar ajustes
      fetchAjustes();
    } catch (error) {
      console.error('Error al procesar reconteo:', error);
      showMessage(
        error instanceof Error ? error.message : 'Error al procesar reconteo',
        'error'
      );
    }
  };

  // Handler para exportar reconteo a PDF
  const handleExportarPDF = () => {
    if (!almacenReconteo || productosReconteo.length === 0) {
      showMessage('Debe cargar el inventario primero', 'error');
      return;
    }

    // Obtener nombre del almacén
    const almacen = almacenes.find((a) => a.id === parseInt(almacenReconteo));
    if (!almacen) {
      showMessage('Almacén no encontrado', 'error');
      return;
    }

    // Preparar datos para el PDF
    const reconteoPDF = {
      almacenNombre: almacen.nombre,
      motivo: motivoReconteo,
      observaciones: observacionesReconteo || undefined,
      fecha: new Date(),
      usuarioNombre: session?.user?.name || 'Usuario',
      productos: productosReconteo,
    };

    try {
      generarPDFReconteo(reconteoPDF);
      showMessage('PDF generado exitosamente', 'success');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      showMessage('Error al generar PDF', 'error');
    }
  };

  const motivosDisponibles = formData.tipoMovimiento === 'entrada'
    ? MOTIVOS_ENTRADA
    : MOTIVOS_BAJA;

  if (loading) {
    return (
      <div className="main-content" style={{ background: "var(--bg)" }}>
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 lg:pb-8">
          <div className="card bg-white">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB]"></div>
              <p className="ml-4 text-[#64748B]">Cargando ajustes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalAjustes = ajustes.length;
  const totalEntradas = ajustes.filter((a) => a.tipoMovimiento === 'entrada').length;
  const totalBajas = ajustes.filter((a) => a.tipoMovimiento === 'baja').length;

  return (
    <div className="main-content" style={{ background: "var(--bg)" }}>
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 lg:pb-8">
        {/* Header Section */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-['Playfair_Display'] font-bold text-[#1F2937] mb-2">
              Ajustes de Inventario
            </h1>
            <p className="text-sm sm:text-base text-[#64748B]">
              Gestiona entradas (compras) y bajas de productos
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowReconteoModal(true)}
              className="bg-[#059669] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#047857] transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Reconteo de Inventario
            </button>
            <button
              onClick={handleOpenModal}
              className="bg-[#2563EB] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#1E40AF] transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Ajuste
            </button>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#64748B]">Total Ajustes</p>
                <p className="text-3xl font-bold text-[#1F2937] mt-2">{totalAjustes}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#64748B]">Entradas</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{totalEntradas}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#64748B]">Bajas</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{totalBajas}</p>
              </div>
              <div className="bg-red-100 rounded-full p-3">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Ajustes */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Almacén
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor/Resp.
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ajustes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No hay ajustes registrados
                    </td>
                  </tr>
                ) : (
                  ajustes.map((ajuste) => (
                    <tr key={ajuste.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(ajuste.fechaSolicitud).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            ajuste.tipoMovimiento === 'entrada'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {ajuste.tipoMovimiento === 'entrada' ? '↑ Entrada' : '↓ Baja'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ajuste.motivo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ajuste.almacenNombre}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs">
                          {ajuste.detalles.map((detalle, idx) => (
                            <div key={idx} className="text-xs">
                              {detalle.nombreProducto} ({detalle.cantidad})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ajuste.proveedorResponsable || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Nuevo Ajuste */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#1F2937]">Nuevo Ajuste de Inventario</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Tipo de Ajuste */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Ajuste *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="entrada"
                        checked={formData.tipoMovimiento === 'entrada'}
                        onChange={(e) => setFormData({ ...formData, tipoMovimiento: e.target.value as 'entrada' | 'baja', motivo: '' })}
                        className="mr-2"
                      />
                      <span className="text-green-700 font-semibold">↑ Entrada (Compra/Devolución)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="baja"
                        checked={formData.tipoMovimiento === 'baja'}
                        onChange={(e) => setFormData({ ...formData, tipoMovimiento: e.target.value as 'entrada' | 'baja', motivo: '' })}
                        className="mr-2"
                      />
                      <span className="text-red-700 font-semibold">↓ Baja (Daño/Pérdida)</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Almacén */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Almacén *
                    </label>
                    <select
                      value={formData.almacenId}
                      onChange={(e) => setFormData({ ...formData, almacenId: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar almacén</option>
                      {almacenes.map((almacen) => (
                        <option key={almacen.id} value={almacen.id}>
                          {almacen.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Motivo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Motivo *
                    </label>
                    <select
                      value={formData.motivo}
                      onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar motivo</option>
                      {motivosDisponibles.map((motivo) => (
                        <option key={motivo} value={motivo}>
                          {motivo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Proveedor/Responsable */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proveedor / Responsable
                  </label>
                  <input
                    type="text"
                    value={formData.proveedorResponsable}
                    onChange={(e) => setFormData({ ...formData, proveedorResponsable: e.target.value })}
                    placeholder="Nombre del proveedor o responsable (opcional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Observaciones */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    placeholder="Observaciones adicionales (opcional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Agregar Productos */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Agregar Productos</h3>
                  <div className="flex gap-2 mb-3">
                    <select
                      value={productoSeleccionado}
                      onChange={(e) => setProductoSeleccionado(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar producto</option>
                      {productos.map((producto) => (
                        <option key={producto.id} value={producto.id}>
                          {producto.nombre} ({producto.codigo})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={cantidadProducto}
                      onChange={(e) => setCantidadProducto(e.target.value)}
                      placeholder="Cantidad"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAgregarProducto}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                    >
                      Agregar
                    </button>
                  </div>

                  {/* Lista de productos agregados */}
                  {productosAjuste.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-2">Productos agregados:</p>
                      <div className="space-y-2">
                        {productosAjuste.map((prod) => (
                          <div
                            key={prod.productoId}
                            className="flex justify-between items-center bg-white p-2 rounded border"
                          >
                            <span className="text-sm">
                              {prod.nombreProducto} - <strong>{prod.cantidad}</strong> unidades
                            </span>
                            <button
                              type="button"
                              onClick={() => handleEliminarProducto(prod.productoId)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1E40AF]"
                  >
                    Registrar Ajuste
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reconteo de Inventario */}
      {showReconteoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-[#059669] to-[#047857] text-white px-6 py-4">
              <h2 className="text-2xl font-bold">Reconteo de Inventario</h2>
              <p className="text-sm mt-1">Ingresa el stock físico y ajusta automáticamente las diferencias</p>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Selección de almacén y carga de inventario */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Almacén *
                    </label>
                    <select
                      value={almacenReconteo}
                      onChange={(e) => setAlmacenReconteo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Seleccionar almacén</option>
                      {almacenes.map((almacen) => (
                        <option key={almacen.id} value={almacen.id}>
                          {almacen.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Motivo
                    </label>
                    <input
                      type="text"
                      value={motivoReconteo}
                      onChange={(e) => setMotivoReconteo(e.target.value)}
                      placeholder="Ej: Reconteo físico, Auditoría mensual"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <button
                      onClick={handleCargarInventario}
                      disabled={!almacenReconteo || loadingInventario}
                      className="w-full bg-[#059669] text-white px-4 py-2 rounded-lg hover:bg-[#047857] disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loadingInventario ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Cargando...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Cargar Inventario
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Observaciones */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones (opcional)
                  </label>
                  <textarea
                    value={observacionesReconteo}
                    onChange={(e) => setObservacionesReconteo(e.target.value)}
                    rows={2}
                    placeholder="Notas adicionales sobre el reconteo..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Tabla de productos para reconteo */}
              {productosReconteo.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Código
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Producto
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tipo
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stock Sistema
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stock Físico
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Diferencia
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {productosReconteo.map((producto) => (
                          <tr
                            key={producto.productoId}
                            className={
                              producto.diferencia !== 0
                                ? producto.diferencia > 0
                                  ? 'bg-green-50'
                                  : 'bg-red-50'
                                : ''
                            }
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {producto.codigo}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {producto.nombre}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {producto.tipo}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center font-semibold">
                              {producto.stockActual}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              <input
                                type="number"
                                min="0"
                                value={producto.stockFisico}
                                onChange={(e) =>
                                  handleStockFisicoChange(
                                    producto.productoId,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              <span
                                className={`font-bold ${
                                  producto.diferencia > 0
                                    ? 'text-green-600'
                                    : producto.diferencia < 0
                                    ? 'text-red-600'
                                    : 'text-gray-500'
                                }`}
                              >
                                {producto.diferencia > 0 && '+'}
                                {producto.diferencia}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Resumen de diferencias */}
                  <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex gap-6">
                        <span className="text-gray-600">
                          Total productos: <strong>{productosReconteo.length}</strong>
                        </span>
                        <span className="text-green-600">
                          Entradas:{' '}
                          <strong>
                            {productosReconteo.filter((p) => p.diferencia > 0).length}
                          </strong>
                        </span>
                        <span className="text-red-600">
                          Bajas:{' '}
                          <strong>
                            {productosReconteo.filter((p) => p.diferencia < 0).length}
                          </strong>
                        </span>
                        <span className="text-gray-600">
                          Sin cambios:{' '}
                          <strong>
                            {productosReconteo.filter((p) => p.diferencia === 0).length}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {productosReconteo.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                  <p>Selecciona un almacén y carga el inventario para comenzar el reconteo</p>
                </div>
              )}
            </div>

            {/* Footer con botones */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
              {/* Botón Exportar PDF a la izquierda */}
              <button
                onClick={handleExportarPDF}
                disabled={productosReconteo.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Exportar PDF
              </button>

              {/* Botones Cancelar y Procesar a la derecha */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReconteoModal(false);
                    setAlmacenReconteo('');
                    setProductosReconteo([]);
                    setMotivoReconteo('Reconteo físico');
                    setObservacionesReconteo('');
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitReconteo}
                  disabled={productosReconteo.filter((p) => p.diferencia !== 0).length === 0}
                  className="px-6 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Procesar Ajustes (
                  {productosReconteo.filter((p) => p.diferencia !== 0).length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
