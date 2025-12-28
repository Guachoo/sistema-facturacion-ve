import jsPDF from 'jspdf';
import { formatVES, formatDateVE, formatNumber } from './formatters';
import type { Invoice } from '@/types';

/**
 * Generador de PDF que replica exactamente la estructura de factura de GRU Corporación Náutica de Servicios
 */
export const generateGRUInvoicePDF = (invoice: Invoice): void => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;  // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const margin = 15;
  let yPos = 20;

  // Configurar fuentes
  doc.setFont('helvetica');

  // ===== ENCABEZADO PRINCIPAL =====
  // Logo y nombre de la empresa (lado izquierdo)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GRU CORPORACION NAUTICA DE SERVICIOS', margin, yPos);

  yPos += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('RIF: J-50015830-4', margin, yPos);

  yPos += 4;
  doc.text('Av. Principal de Maiquetía, Local N° 15-A', margin, yPos);

  yPos += 4;
  doc.text('Zona Industrial La Guaira, Estado Vargas', margin, yPos);

  yPos += 4;
  doc.text('Teléfono: 0212-355-7890', margin, yPos);

  // Información fiscal (lado derecho)
  const rightX = pageWidth - margin - 60;
  yPos = 20;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA', rightX, yPos);

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° Control: ${invoice.numeroControl}`, rightX, yPos);

  yPos += 5;
  doc.text(`N° Factura: ${invoice.numero}`, rightX, yPos);

  yPos += 5;
  doc.text(`Serie: ${invoice.serie || 'A'}`, rightX, yPos);

  yPos += 5;
  doc.text(`Fecha: ${formatDateVE(invoice.fecha)}`, rightX, yPos);

  yPos += 5;
  doc.text(`Hora: ${invoice.horaEmision || '12:00:00 pm'}`, rightX, yPos);

  // Línea separadora
  yPos = 55;
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 10;

  // ===== DATOS DEL CLIENTE =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL CLIENTE:', margin, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const clienteNombre = invoice.receptor.razonSocial || invoice.receptor.nombre || '';
  doc.text(`Cliente: ${clienteNombre}`, margin, yPos);

  yPos += 5;
  doc.text(`RIF/CI: ${invoice.receptor.identificacion}`, margin, yPos);

  yPos += 5;
  doc.text(`Dirección: ${invoice.receptor.domicilio}`, margin, yPos);

  if (invoice.receptor.telefono) {
    yPos += 5;
    doc.text(`Teléfono: ${invoice.receptor.telefono}`, margin, yPos);
  }

  if (invoice.receptor.correo || invoice.receptor.email) {
    yPos += 5;
    doc.text(`Email: ${invoice.receptor.correo || invoice.receptor.email}`, margin, yPos);
  }

  yPos += 15;

  // ===== TABLA DE PRODUCTOS/SERVICIOS =====
  // Encabezados de tabla
  const tableStartY = yPos;
  const colWidths = [15, 80, 15, 25, 20, 25, 25]; // Anchos de columnas
  const colPositions = [margin];

  // Calcular posiciones de columnas
  for (let i = 0; i < colWidths.length - 1; i++) {
    colPositions.push(colPositions[i] + colWidths[i]);
  }

  // Fondo de encabezado
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos - 2, pageWidth - (2 * margin), 8, 'F');

  // Bordes de tabla
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos - 2, pageWidth - (2 * margin), 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  doc.text('CANT', colPositions[0] + 2, yPos + 3);
  doc.text('DESCRIPCIÓN', colPositions[1] + 2, yPos + 3);
  doc.text('CÓDIGO', colPositions[2] + 2, yPos + 3);
  doc.text('P. UNITARIO', colPositions[3] + 2, yPos + 3);
  doc.text('DESCUENTO', colPositions[4] + 2, yPos + 3);
  doc.text('IVA %', colPositions[5] + 2, yPos + 3);
  doc.text('TOTAL', colPositions[6] + 2, yPos + 3);

  yPos += 8;

  // Líneas de productos
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  let subtotalSinIva = 0;
  let totalIva = 0;
  let totalGeneral = 0;

  invoice.lineas.forEach((linea, index) => {
    const rowHeight = 6;

    // Alternar color de filas
    if (index % 2 === 1) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, yPos - 1, pageWidth - (2 * margin), rowHeight, 'F');
    }

    // Bordes de fila
    doc.setLineWidth(0.1);
    doc.rect(margin, yPos - 1, pageWidth - (2 * margin), rowHeight);

    // Datos de la línea
    doc.text(linea.cantidad.toString(), colPositions[0] + 2, yPos + 3, { align: 'left' });

    // Descripción (truncar si es muy larga)
    let descripcion = linea.descripcion;
    if (descripcion.length > 35) {
      descripcion = descripcion.substring(0, 32) + '...';
    }
    doc.text(descripcion, colPositions[1] + 2, yPos + 3);

    doc.text(linea.codigo, colPositions[2] + 2, yPos + 3);
    doc.text(formatVES(linea.precioUnitario), colPositions[3] + 2, yPos + 3, { align: 'right' });
    doc.text(`${linea.descuento}%`, colPositions[4] + 2, yPos + 3, { align: 'right' });
    doc.text(`${linea.alicuotaIva}%`, colPositions[5] + 2, yPos + 3, { align: 'right' });
    doc.text(formatVES(linea.total), colPositions[6] + 2, yPos + 3, { align: 'right' });

    // Calcular totales
    subtotalSinIva += linea.baseImponible;
    totalIva += linea.montoIva;
    totalGeneral += linea.total;

    yPos += rowHeight;
  });

  // Línea final de tabla
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 15;

  // ===== TOTALES =====
  const totalsX = pageWidth - margin - 80;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  doc.text('Subtotal (Exento):', totalsX, yPos);
  doc.text(formatVES(invoice.montoExento || 0), totalsX + 50, yPos, { align: 'right' });

  yPos += 6;
  doc.text('Subtotal (Base Imponible):', totalsX, yPos);
  doc.text(formatVES(subtotalSinIva), totalsX + 50, yPos, { align: 'right' });

  yPos += 6;
  doc.text('IVA (16%):', totalsX, yPos);
  doc.text(formatVES(totalIva), totalsX + 50, yPos, { align: 'right' });

  yPos += 6;
  // IGTF si aplica
  const igtf = totalGeneral * 0.03; // 3% IGTF
  doc.text('IGTF (3%):', totalsX, yPos);
  doc.text(formatVES(igtf), totalsX + 50, yPos, { align: 'right' });

  yPos += 8;
  // Total final
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL A PAGAR:', totalsX, yPos);
  doc.text(formatVES(totalGeneral + igtf), totalsX + 50, yPos, { align: 'right' });

  yPos += 15;

  // ===== INFORMACIÓN ADICIONAL =====
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  doc.text('INFORMACIÓN FISCAL:', margin, yPos);
  yPos += 5;
  doc.text('• Esta factura fue generada de acuerdo a la normativa SENIAT vigente', margin + 5, yPos);
  yPos += 4;
  doc.text('• Contribuyente Ordinario - No agente de retención', margin + 5, yPos);
  yPos += 4;
  doc.text('• Válida únicamente con el código QR de verificación', margin + 5, yPos);

  yPos += 10;

  // ===== PIE DE PÁGINA =====
  doc.setFontSize(7);
  doc.text('Documento generado electrónicamente - GRU Corporación Náutica de Servicios', margin, pageHeight - 20);
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-VE')} - ${new Date().toLocaleTimeString('es-VE')}`, margin, pageHeight - 15);

  // Código QR placeholder (en una implementación real, aquí iría el QR real)
  doc.setLineWidth(0.5);
  doc.rect(pageWidth - margin - 25, pageHeight - 35, 20, 20);
  doc.setFontSize(6);
  doc.text('Código QR', pageWidth - margin - 22, pageHeight - 12, { align: 'center' });
  doc.text('SENIAT', pageWidth - margin - 22, pageHeight - 9, { align: 'center' });

  // Descargar el PDF
  const fileName = `Factura_GRU_${invoice.numero}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};