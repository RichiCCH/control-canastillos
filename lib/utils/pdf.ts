import jsPDF from 'jspdf';

interface ProductoPDF {
  codigo: string;
  nombre: string;
  tipo: string;
  cantidad: number;
  unidadMedida?: string;
}

interface MovimientoPDF {
  id: number;
  fechaSolicitud: string;
  fechaAprobacion?: string;
  almacenOrigen: {
    id: number;
    nombre: string;
  };
  almacenDestino: {
    id: number;
    nombre: string;
  };
  usuarioSolicitante: {
    id: number;
    nombre: string;
  };
  usuarioAprobador?: {
    id: number;
    nombre: string;
  };
  observaciones?: string | null;
  detalles: ProductoPDF[];
}

// Función para obtener el icono del tipo de producto
const getTipoIcon = (tipo: string): string => {
  const icons: Record<string, string> = {
    canastillo_negro: 'Negro',
    canastillo_color: 'Color',
    cooler: 'Cooler',
    caja: 'Caja',
  };
  return icons[tipo] || 'Producto';
};

// Función para generar PDF de Salida (Papel Térmico 80mm)
export function generarPDFSalida(movimiento: MovimientoPDF): void {
  // Configuración para papel térmico de 80mm de ancho
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 200] // 80mm de ancho, altura inicial
  });

  const pageWidth = 80;
  const margin = 3;
  let yPos = 3;

  // Encabezado compacto
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTA DE ENVIO', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`NF01 ${String(movimiento.id).padStart(4, '0')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;

  // Línea separadora delgada
  doc.setLineWidth(0.1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 3;

  // Información del movimiento compacta
  doc.setFontSize(7);
  const fecha = new Date(movimiento.fechaSolicitud);

  doc.setFont('helvetica', 'normal');
  doc.text(`FECHA: ${fecha.toLocaleDateString('es-ES')} ${fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`, margin, yPos);
  yPos += 3;

  doc.text(`ORIGEN: ${movimiento.almacenOrigen.nombre}`, margin, yPos);
  yPos += 3;

  doc.text(`DESTINO: ${movimiento.almacenDestino.nombre}`, margin, yPos);
  yPos += 3;

  doc.text(`ENVIA: ${movimiento.usuarioSolicitante.nombre}`, margin, yPos);
  yPos += 4;

  // Observaciones si existen
  if (movimiento.observaciones) {
    doc.text(`OBSERVACIONES:`, margin, yPos);
    yPos += 3;
    const obsLines = doc.splitTextToSize(movimiento.observaciones, pageWidth - (margin * 2));
    doc.text(obsLines, margin, yPos);
    yPos += obsLines.length * 3 + 1;
  }

  // Línea separadora
  doc.setLineWidth(0.1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 3;

  // Productos compacto
  let totalUnidades = 0;

  movimiento.detalles.forEach((detalle, index) => {
    // Separador entre productos
    if (index > 0) {
      doc.setLineWidth(0.1);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 2;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`PRODUCTO:`, margin, yPos);
    yPos += 3;

    doc.setFont('helvetica', 'bold');
    const productoLines = doc.splitTextToSize(detalle.nombre, pageWidth - (margin * 2));
    doc.text(productoLines, margin, yPos);
    yPos += productoLines.length * 3;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`CODIGO: ${detalle.codigo}`, margin, yPos);
    yPos += 3;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`CANTIDAD:`, margin, yPos);
    doc.text(`${detalle.cantidad}`, pageWidth - margin - 5, yPos, { align: 'right' });
    yPos += 4;

    totalUnidades += detalle.cantidad;
  });

  // Línea separadora final
  yPos += 1;
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 3;

  // Total compacto
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`TOTAL PRODUCTOS:`, margin, yPos);
  doc.text(`${movimiento.detalles.length}`, pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 3;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL UNIDADES:`, margin, yPos);
  doc.text(`${totalUnidades}`, pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 5;

  // Línea separadora
  doc.setLineWidth(0.1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 3;

  // Sección de firmas
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('ENTREGO:', margin, yPos);
  yPos += 8;
  doc.line(margin, yPos, pageWidth / 2 - 2, yPos);
  doc.text('Firma y Fecha', margin, yPos + 3);
  yPos += 8;

  doc.text('RECIBIDO:', margin, yPos);
  yPos += 8;
  doc.line(margin, yPos, pageWidth / 2 - 2, yPos);
  doc.text('Firma y Fecha', margin, yPos + 3);

  // Descargar el PDF
  doc.save(`salida_${movimiento.id}_${fecha.toISOString().split('T')[0]}.pdf`);
}

// Función para generar PDF de Recepción (Papel Térmico 80mm)
export function generarPDFRecepcion(movimiento: MovimientoPDF): void {
  // Configuración para papel térmico de 80mm de ancho
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 200] // 80mm de ancho, altura inicial
  });

  const pageWidth = 80;
  const margin = 3;
  let yPos = 3;

  // Encabezado compacto
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTA DE RECEPCION', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`NR01 ${String(movimiento.id).padStart(4, '0')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;

  // Línea separadora delgada
  doc.setLineWidth(0.1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 3;

  // Información del movimiento compacta
  doc.setFontSize(7);
  const fechaSolicitud = new Date(movimiento.fechaSolicitud);
  const fechaAprobacion = movimiento.fechaAprobacion ? new Date(movimiento.fechaAprobacion) : null;

  doc.setFont('helvetica', 'normal');
  doc.text(`FECHA: ${fechaSolicitud.toLocaleDateString('es-ES')} ${fechaSolicitud.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`, margin, yPos);
  yPos += 3;

  doc.text(`ORIGEN: ${movimiento.almacenOrigen.nombre}`, margin, yPos);
  yPos += 3;

  doc.text(`RECEPTOR: ${movimiento.almacenDestino.nombre}`, margin, yPos);
  yPos += 3;

  doc.text(`ENVIA: ${movimiento.usuarioSolicitante.nombre}`, margin, yPos);
  yPos += 3;

  if (movimiento.usuarioAprobador) {
    doc.text(`RECIBE: ${movimiento.usuarioAprobador.nombre}`, margin, yPos);
    yPos += 3;
  }

  if (fechaAprobacion) {
    doc.text(`RECEPCION: ${fechaAprobacion.toLocaleDateString('es-ES')} ${fechaAprobacion.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`, margin, yPos);
    yPos += 3;
  }

  yPos += 1;

  // Observaciones si existen
  if (movimiento.observaciones) {
    doc.text(`OBSERVACIONES:`, margin, yPos);
    yPos += 3;
    const obsLines = doc.splitTextToSize(movimiento.observaciones, pageWidth - (margin * 2));
    doc.text(obsLines, margin, yPos);
    yPos += obsLines.length * 3 + 1;
  }

  // Línea separadora
  doc.setLineWidth(0.1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 3;

  // Productos compacto
  let totalUnidades = 0;

  movimiento.detalles.forEach((detalle, index) => {
    // Separador entre productos
    if (index > 0) {
      doc.setLineWidth(0.1);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 2;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`PRODUCTO:`, margin, yPos);
    yPos += 3;

    doc.setFont('helvetica', 'bold');
    const productoLines = doc.splitTextToSize(detalle.nombre, pageWidth - (margin * 2));
    doc.text(productoLines, margin, yPos);
    yPos += productoLines.length * 3;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`CODIGO: ${detalle.codigo}`, margin, yPos);
    yPos += 3;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`CANTIDAD:`, margin, yPos);
    doc.text(`${detalle.cantidad}`, pageWidth - margin - 5, yPos, { align: 'right' });
    yPos += 4;

    totalUnidades += detalle.cantidad;
  });

  // Línea separadora final
  yPos += 1;
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 3;

  // Total compacto
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`TOTAL PRODUCTOS:`, margin, yPos);
  doc.text(`${movimiento.detalles.length}`, pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 3;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL UNIDADES:`, margin, yPos);
  doc.text(`${totalUnidades}`, pageWidth - margin - 5, yPos, { align: 'right' });
  yPos += 5;

  // Línea separadora
  doc.setLineWidth(0.1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 3;

  // Sección de firmas
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('ESTADO: Recibido', margin, yPos);
  yPos += 8;

  doc.text('ENTREGO:', margin, yPos);
  yPos += 8;
  doc.line(margin, yPos, pageWidth / 2 - 2, yPos);
  doc.text('Firma y Fecha', margin, yPos + 3);
  yPos += 8;

  doc.text('RECIBIDO:', margin, yPos);
  yPos += 8;
  doc.line(margin, yPos, pageWidth / 2 - 2, yPos);
  doc.text('Firma y Fecha', margin, yPos + 3);

  // Descargar el PDF
  const fechaStr = movimiento.fechaAprobacion
    ? new Date(movimiento.fechaAprobacion).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  doc.save(`recepcion_${movimiento.id}_${fechaStr}.pdf`);
}
