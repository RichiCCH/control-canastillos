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
  estado?: string;
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
  transportadoPor?: string | null;
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
  const margin = 2;
  let yPos = 2;

  const fecha = new Date(movimiento.fechaSolicitud);
  const fechaStr = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaStr = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  // Línea superior
  doc.setFontSize(8);
  doc.setFont('courier', 'normal');
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Encabezado
  doc.setFont('courier', 'bold');
  doc.text('NOTA DE ENVIO | NF01-' + String(movimiento.id).padStart(4, '0'), margin, yPos);
  yPos += 4;

  doc.setFont('courier', 'normal');
  doc.text(`Fecha: ${fechaStr} | Hora: ${horaStr}`, margin, yPos);
  yPos += 4;

  // Estado dinámico basado en la base de datos
  const estadoLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
    anulado: 'Anulado',
  };
  const estadoActual = movimiento.estado ? estadoLabels[movimiento.estado] || 'Pendiente' : 'Pendiente';
  doc.text(`Estado: ${estadoActual}`, margin, yPos);
  yPos += 4;

  // Línea separadora
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Información de origen/destino
  doc.text(`Origen: ${movimiento.almacenOrigen.nombre}`, margin, yPos);
  yPos += 4;

  doc.text(`Destino: ${movimiento.almacenDestino.nombre}`, margin, yPos);
  yPos += 4;

  doc.text(`Envia: ${movimiento.usuarioSolicitante.nombre}`, margin, yPos);
  yPos += 4;

  doc.text(`Transporta: ${movimiento.transportadoPor || ''}`, margin, yPos);
  yPos += 4;

  // Línea separadora
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Título de productos
  doc.setFont('courier', 'bold');
  doc.text('PRODUCTOS ENVIADOS', margin, yPos);
  yPos += 4;

  // Línea separadora
  doc.setFont('courier', 'normal');
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Encabezado de tabla
  doc.setFont('courier', 'bold');
  doc.text('| Cod  | Producto            | Cant |', margin, yPos);
  yPos += 4;

  doc.setFont('courier', 'normal');
  doc.text('|------|---------------------|------|', margin, yPos);
  yPos += 4;

  // Productos en tabla
  movimiento.detalles.forEach((detalle) => {
    const codigo = detalle.codigo.padEnd(4, ' ').substring(0, 4);
    const producto = detalle.nombre.padEnd(19, ' ').substring(0, 19);
    const cantidad = String(detalle.cantidad).padStart(4, ' ');

    doc.text(`| ${codigo} | ${producto} | ${cantidad} |`, margin, yPos);
    yPos += 4;
  });

  // Línea separadora
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Observaciones
  if (movimiento.observaciones) {
    doc.text(`Observacion: ${movimiento.observaciones}`, margin, yPos);
    yPos += 4;

    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;
  }

  // Validación
  doc.setFont('courier', 'bold');
  doc.text('Validacion', margin, yPos);
  yPos += 4;

  doc.setFont('courier', 'normal');

  // Autorrellenar si está aprobado o rechazado
  if (movimiento.usuarioAprobador && movimiento.fechaAprobacion && (movimiento.estado === 'aprobado' || movimiento.estado === 'rechazado')) {
    const fechaAprobacion = new Date(movimiento.fechaAprobacion);
    const fechaAprobacionStr = fechaAprobacion.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaAprobacionStr = fechaAprobacion.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const accionLabel = movimiento.estado === 'rechazado' ? 'Rechazado Por' : 'Aprobado Por';
    doc.text(`- ${accionLabel}: ${movimiento.usuarioAprobador.nombre}`, margin, yPos);
    yPos += 4;
    doc.text(`- Fecha/Hora: ${fechaAprobacionStr} ${horaAprobacionStr}`, margin, yPos);
    yPos += 4;
  } else {
    // Si está pendiente o anulado, dejar espacios en blanco
    doc.text('- Aprobado Por: ', margin, yPos);
    yPos += 4;
    doc.text('- Fecha/Hora:', margin, yPos);
    yPos += 4;
  }

  // Línea separadora
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Firmas
  doc.setFont('courier', 'bold');
  doc.text('Firmas', margin, yPos);
  yPos += 4;

  doc.setFont('courier', 'normal');
  doc.text('Entrego: ____________ Fecha: ______________', margin, yPos);
  yPos += 5;

  doc.text('Recibio: ____________ Fecha: ______________', margin, yPos);
  yPos += 4;

  // Línea inferior
  doc.line(margin, yPos, pageWidth - margin, yPos);

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
  const margin = 2;
  let yPos = 2;

  const fechaSolicitud = new Date(movimiento.fechaSolicitud);
  const fechaSolicitudStr = fechaSolicitud.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaSolicitudStr = fechaSolicitud.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const fechaAprobacion = movimiento.fechaAprobacion ? new Date(movimiento.fechaAprobacion) : null;
  const fechaAprobacionStr = fechaAprobacion ? fechaAprobacion.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const horaAprobacionStr = fechaAprobacion ? fechaAprobacion.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';

  // Encabezado
  doc.setFontSize(8);
  doc.setFont('courier', 'bold');
  doc.text('NOTA DE RECEPCION | NR01-' + String(movimiento.id).padStart(4, '0'), margin, yPos);
  yPos += 4;

  doc.setFont('courier', 'normal');
  doc.text(`Fecha Envio: ${fechaSolicitudStr} | Hora: ${horaSolicitudStr}`, margin, yPos);
  yPos += 4;

  if (fechaAprobacion) {
    doc.text(`Fecha Recepcion: ${fechaAprobacionStr} | Hora: ${horaAprobacionStr}`, margin, yPos);
    yPos += 4;
  }

  // Estado dinámico basado en la base de datos
  const estadoLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    aprobado: 'Recibido',
    rechazado: 'Rechazado',
    anulado: 'Anulado',
  };
  const estadoActual = movimiento.estado ? estadoLabels[movimiento.estado] || 'Recibido' : 'Recibido';
  doc.text(`Estado: ${estadoActual}`, margin, yPos);
  yPos += 4;

  // Línea separadora
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Información de origen/destino
  doc.text(`Origen: ${movimiento.almacenOrigen.nombre}`, margin, yPos);
  yPos += 4;

  doc.text(`Destino: ${movimiento.almacenDestino.nombre}`, margin, yPos);
  yPos += 4;

  doc.text(`Envia: ${movimiento.usuarioSolicitante.nombre}`, margin, yPos);
  yPos += 4;

  if (movimiento.usuarioAprobador) {
    doc.text(`Recibe: ${movimiento.usuarioAprobador.nombre}`, margin, yPos);
    yPos += 4;
  }

  if (movimiento.transportadoPor) {
    doc.text(`Transporta: ${movimiento.transportadoPor}`, margin, yPos);
    yPos += 4;
  }

  // Línea separadora
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Título de productos
  doc.setFont('courier', 'bold');
  doc.text('PRODUCTOS RECIBIDOS', margin, yPos);
  yPos += 4;

  // Línea separadora
  doc.setFont('courier', 'normal');
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Encabezado de tabla
  doc.setFont('courier', 'bold');
  doc.text('| Codigo | Producto         | Cantidad |', margin, yPos);
  yPos += 4;

  doc.setFont('courier', 'normal');
  doc.text('|--------|------------------|----------|', margin, yPos);
  yPos += 4;

  // Productos en tabla
  movimiento.detalles.forEach((detalle) => {
    const codigo = detalle.codigo.padEnd(6, ' ').substring(0, 6);
    const producto = detalle.nombre.padEnd(16, ' ').substring(0, 16);
    const cantidad = String(detalle.cantidad).padStart(8, ' ');

    doc.text(`| ${codigo} | ${producto} | ${cantidad} |`, margin, yPos);
    yPos += 4;
  });

  yPos += 1;

  // Línea separadora
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Observaciones
  if (movimiento.observaciones) {
    doc.text(`Observacion: ${movimiento.observaciones}`, margin, yPos);
    yPos += 4;

    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;
  }

  // Validación
  doc.setFont('courier', 'bold');
  doc.text('Validacion', margin, yPos);
  yPos += 4;

  doc.setFont('courier', 'normal');

  // Autorrellenar si está aprobado o rechazado
  if (movimiento.usuarioAprobador && movimiento.fechaAprobacion && (movimiento.estado === 'aprobado' || movimiento.estado === 'rechazado')) {
    const fechaAprobacion = new Date(movimiento.fechaAprobacion);
    const fechaAprobacionStr = fechaAprobacion.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaAprobacionStr = fechaAprobacion.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const accionLabel = movimiento.estado === 'rechazado' ? 'Rechazado Por' : 'Recibido Por';
    doc.text(`- ${accionLabel}: ${movimiento.usuarioAprobador.nombre}`, margin, yPos);
    yPos += 4;
    doc.text(`- Fecha/Hora: ${fechaAprobacionStr} ${horaAprobacionStr}`, margin, yPos);
    yPos += 4;
  } else {
    // Si está pendiente o anulado, dejar espacios en blanco
    doc.text('- Recibido Por: ', margin, yPos);
    yPos += 4;
    doc.text('- Fecha/Hora:', margin, yPos);
    yPos += 4;
  }

  // Línea separadora
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Firmas
  doc.setFont('courier', 'bold');
  doc.text('Firmas', margin, yPos);
  yPos += 4;

  doc.setFont('courier', 'normal');
  doc.text('Entrego: ____________ Fecha: ______________', margin, yPos);
  yPos += 5;

  doc.text('Recibio: ____________ Fecha: ______________', margin, yPos);
  yPos += 4;

  // Línea inferior
  doc.line(margin, yPos, pageWidth - margin, yPos);

  // Descargar el PDF
  const fechaStr = movimiento.fechaAprobacion
    ? new Date(movimiento.fechaAprobacion).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  doc.save(`recepcion_${movimiento.id}_${fechaStr}.pdf`);
}

// Interfaz para Reconteo de Inventario
interface ProductoReconteoPDF {
  codigo: string;
  nombre: string;
  tipo: string;
  stockActual: number;
  stockFisico: number;
  diferencia: number;
}

interface ReconteoPDF {
  almacenNombre: string;
  motivo: string;
  observaciones?: string;
  fecha: Date;
  usuarioNombre: string;
  productos: ProductoReconteoPDF[];
}

// Función para generar PDF de Reconteo de Inventario (Hoja Carta)
export function generarPDFReconteo(reconteo: ReconteoPDF): void {
  // Configuración para hoja carta (Letter: 215.9mm x 279.4mm)
  const doc = new jsPDF({
    unit: 'mm',
    format: 'letter',
    orientation: 'portrait'
  });

  const pageWidth = 215.9;
  const pageHeight = 279.4;
  const margin = 15;
  let yPos = 20;

  const fecha = new Date(reconteo.fecha);
  const fechaStr = fecha.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const horaStr = fecha.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // ============ ENCABEZADO ============
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RECONTEO DE INVENTARIO', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Línea decorativa
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // ============ INFORMACIÓN GENERAL ============
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  // Almacén
  doc.setFont('helvetica', 'bold');
  doc.text('Almacén:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(reconteo.almacenNombre, margin + 25, yPos);
  yPos += 7;

  // Motivo
  doc.setFont('helvetica', 'bold');
  doc.text('Motivo:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(reconteo.motivo, margin + 25, yPos);
  yPos += 7;

  // Fecha y Hora
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`${fechaStr} - ${horaStr}`, margin + 25, yPos);
  yPos += 7;

  // Usuario
  doc.setFont('helvetica', 'bold');
  doc.text('Realizado por:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(reconteo.usuarioNombre, margin + 35, yPos);
  yPos += 10;

  // Observaciones (si existen)
  if (reconteo.observaciones) {
    doc.setFont('helvetica', 'bold');
    doc.text('Observaciones:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    const obsLines = doc.splitTextToSize(reconteo.observaciones, pageWidth - margin * 2 - 40);
    doc.text(obsLines, margin + 35, yPos);
    yPos += obsLines.length * 5 + 5;
  }

  // Línea separadora
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // ============ TABLA DE PRODUCTOS ============
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE DE PRODUCTOS', pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  // Encabezado de tabla
  const colWidths = {
    codigo: 20,
    nombre: 70,
    tipo: 30,
    stockSistema: 25,
    stockFisico: 25,
    diferencia: 25
  };

  const tableStartX = margin;
  let currentX = tableStartX;

  // Fondo gris para encabezado
  doc.setFillColor(220, 220, 220);
  doc.rect(tableStartX, yPos - 5,
    colWidths.codigo + colWidths.nombre + colWidths.tipo +
    colWidths.stockSistema + colWidths.stockFisico + colWidths.diferencia,
    8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);

  // Código
  doc.text('Código', currentX + colWidths.codigo / 2, yPos, { align: 'center' });
  currentX += colWidths.codigo;

  // Producto
  doc.text('Producto', currentX + colWidths.nombre / 2, yPos, { align: 'center' });
  currentX += colWidths.nombre;

  // Tipo
  doc.text('Tipo', currentX + colWidths.tipo / 2, yPos, { align: 'center' });
  currentX += colWidths.tipo;

  // Stock Sistema
  doc.text('Stock', currentX + colWidths.stockSistema / 2, yPos, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Sistema', currentX + colWidths.stockSistema / 2, yPos + 3, { align: 'center' });
  currentX += colWidths.stockSistema;

  doc.setFontSize(9);
  // Stock Físico
  doc.text('Stock', currentX + colWidths.stockFisico / 2, yPos, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Físico', currentX + colWidths.stockFisico / 2, yPos + 3, { align: 'center' });
  currentX += colWidths.stockFisico;

  doc.setFontSize(9);
  // Diferencia
  doc.text('Diferencia', currentX + colWidths.diferencia / 2, yPos, { align: 'center' });

  yPos += 8;

  // Línea después del encabezado
  doc.setLineWidth(0.5);
  doc.line(tableStartX, yPos,
    tableStartX + colWidths.codigo + colWidths.nombre + colWidths.tipo +
    colWidths.stockSistema + colWidths.stockFisico + colWidths.diferencia,
    yPos);
  yPos += 5;

  // Filas de productos
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  let totalEntradas = 0;
  let totalBajas = 0;

  reconteo.productos.forEach((producto, index) => {
    // Verificar si necesitamos nueva página
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }

    currentX = tableStartX;

    // Fondo alternado para mejor lectura
    if (index % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(tableStartX, yPos - 4,
        colWidths.codigo + colWidths.nombre + colWidths.tipo +
        colWidths.stockSistema + colWidths.stockFisico + colWidths.diferencia,
        6, 'F');
    }

    // Fondo de color según diferencia
    if (producto.diferencia > 0) {
      doc.setFillColor(220, 252, 231); // Verde claro
      doc.rect(tableStartX + colWidths.codigo + colWidths.nombre + colWidths.tipo +
        colWidths.stockSistema + colWidths.stockFisico, yPos - 4,
        colWidths.diferencia, 6, 'F');
      totalEntradas += producto.diferencia;
    } else if (producto.diferencia < 0) {
      doc.setFillColor(254, 226, 226); // Rojo claro
      doc.rect(tableStartX + colWidths.codigo + colWidths.nombre + colWidths.tipo +
        colWidths.stockSistema + colWidths.stockFisico, yPos - 4,
        colWidths.diferencia, 6, 'F');
      totalBajas += Math.abs(producto.diferencia);
    }

    // Código
    doc.text(producto.codigo, currentX + 2, yPos);
    currentX += colWidths.codigo;

    // Producto (truncar si es muy largo)
    const nombreTruncado = producto.nombre.length > 45
      ? producto.nombre.substring(0, 42) + '...'
      : producto.nombre;
    doc.text(nombreTruncado, currentX + 2, yPos);
    currentX += colWidths.nombre;

    // Tipo
    const tipoLabel = getTipoIcon(producto.tipo);
    doc.text(tipoLabel, currentX + colWidths.tipo / 2, yPos, { align: 'center' });
    currentX += colWidths.tipo;

    // Stock Sistema
    doc.text(String(producto.stockActual), currentX + colWidths.stockSistema / 2, yPos, { align: 'center' });
    currentX += colWidths.stockSistema;

    // Stock Físico
    doc.text(String(producto.stockFisico), currentX + colWidths.stockFisico / 2, yPos, { align: 'center' });
    currentX += colWidths.stockFisico;

    // Diferencia (con color)
    if (producto.diferencia > 0) {
      doc.setTextColor(22, 163, 74); // Verde
      doc.setFont('helvetica', 'bold');
      doc.text(`+${producto.diferencia}`, currentX + colWidths.diferencia / 2, yPos, { align: 'center' });
    } else if (producto.diferencia < 0) {
      doc.setTextColor(220, 38, 38); // Rojo
      doc.setFont('helvetica', 'bold');
      doc.text(String(producto.diferencia), currentX + colWidths.diferencia / 2, yPos, { align: 'center' });
    } else {
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text('0', currentX + colWidths.diferencia / 2, yPos, { align: 'center' });
    }

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    yPos += 6;
  });

  // Línea final de tabla
  doc.setLineWidth(0.5);
  doc.line(tableStartX, yPos,
    tableStartX + colWidths.codigo + colWidths.nombre + colWidths.tipo +
    colWidths.stockSistema + colWidths.stockFisico + colWidths.diferencia,
    yPos);
  yPos += 10;

  // ============ RESUMEN ============
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN DEL RECONTEO', margin, yPos);
  yPos += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const totalProductos = reconteo.productos.length;
  const productosConDiferencia = reconteo.productos.filter(p => p.diferencia !== 0).length;
  const productosSinCambio = reconteo.productos.filter(p => p.diferencia === 0).length;

  doc.text(`Total de productos verificados: ${totalProductos}`, margin + 5, yPos);
  yPos += 6;

  doc.setTextColor(22, 163, 74);
  doc.text(`Productos con entrada: ${reconteo.productos.filter(p => p.diferencia > 0).length} (+${totalEntradas} unidades)`, margin + 5, yPos);
  yPos += 6;

  doc.setTextColor(220, 38, 38);
  doc.text(`Productos con baja: ${reconteo.productos.filter(p => p.diferencia < 0).length} (-${totalBajas} unidades)`, margin + 5, yPos);
  yPos += 6;

  doc.setTextColor(0, 0, 0);
  doc.text(`Productos sin cambios: ${productosSinCambio}`, margin + 5, yPos);
  yPos += 15;

  // ============ FIRMAS ============
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('FIRMAS DE VALIDACIÓN', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  const firmaWidth = 70;
  const firmaSpacing = (pageWidth - margin * 2 - firmaWidth * 2) / 3;

  // Firma 1: Realizado por
  let firmaX = margin + firmaSpacing;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.line(firmaX, yPos, firmaX + firmaWidth, yPos);
  doc.text('Realizado por:', firmaX + firmaWidth / 2, yPos + 5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(reconteo.usuarioNombre, firmaX + firmaWidth / 2, yPos + 10, { align: 'center' });

  // Firma 2: Autorizado por
  firmaX = margin + firmaSpacing * 2 + firmaWidth;
  doc.setFont('helvetica', 'normal');
  doc.line(firmaX, yPos, firmaX + firmaWidth, yPos);
  doc.text('Autorizado por:', firmaX + firmaWidth / 2, yPos + 5, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('(Supervisor / Gerente)', firmaX + firmaWidth / 2, yPos + 10, { align: 'center' });

  yPos += 20;

  // Fecha de firma
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  firmaX = margin + firmaSpacing;
  doc.text('Fecha: ___/___/______', firmaX + firmaWidth / 2, yPos, { align: 'center' });

  firmaX = margin + firmaSpacing * 2 + firmaWidth;
  doc.text('Fecha: ___/___/______', firmaX + firmaWidth / 2, yPos, { align: 'center' });

  // ============ PIE DE PÁGINA ============
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Documento generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  // Descargar el PDF
  const fechaArchivo = fecha.toISOString().split('T')[0];
  doc.save(`reconteo_inventario_${reconteo.almacenNombre.replace(/\s+/g, '_')}_${fechaArchivo}.pdf`);
}
