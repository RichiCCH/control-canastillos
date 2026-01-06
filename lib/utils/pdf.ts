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
