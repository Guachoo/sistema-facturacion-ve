import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FacturaDB } from '@/api/facturas';
import { formatVES, formatUSD } from './formatters';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { GRU_LOGO_BASE64 } from './logo-base64';

// Función para convertir número a letras (español venezolano)
function numeroALetras(numero: number): string {
  const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

  if (numero === 0) return 'CERO BOLÍVARES';
  if (numero === 100) return 'CIEN BOLÍVARES';

  let entero = Math.floor(numero);
  const decimal = Math.round((numero - entero) * 100);

  let resultado = '';

  // Millones
  if (entero >= 1000000) {
    const millones = Math.floor(entero / 1000000);
    resultado += (millones === 1 ? 'UN MILLÓN ' : numeroALetras(millones).replace(' BOLÍVARES', '') + ' MILLONES ');
    entero = entero % 1000000;
  }

  // Miles
  if (entero >= 1000) {
    const miles = Math.floor(entero / 1000);
    resultado += (miles === 1 ? 'MIL ' : numeroALetras(miles).replace(' BOLÍVARES', '') + ' MIL ');
    entero = entero % 1000;
  }

  // Centenas
  if (entero >= 100) {
    resultado += centenas[Math.floor(entero / 100)] + ' ';
    entero = entero % 100;
  }

  // Decenas y unidades
  if (entero >= 20) {
    resultado += decenas[Math.floor(entero / 10)] + ' ';
    if (entero % 10 > 0) {
      resultado += 'Y ' + unidades[entero % 10] + ' ';
    }
  } else if (entero >= 10) {
    resultado += especiales[entero - 10] + ' ';
  } else if (entero > 0) {
    resultado += unidades[entero] + ' ';
  }

  resultado += 'BOLÍVARES';

  if (decimal > 0) {
    resultado += ' CON ' + decimal.toString().padStart(2, '0') + '/100';
  }

  return resultado.trim();
}

// Mapear tipo de pago a descripción
function obtenerDescripcionTipoPago(tipoPago: string): string {
  const mapeo: Record<string, string> = {
    'efectivo': 'Efectivo Moneda Curso Legal',
    'transferencia_ves': 'TRANSFERENCIA',
    'tarjeta_debito': 'Tarjeta de Débito',
    'tarjeta_credito': 'Tarjeta de Crédito',
    'cheque': 'Cheque',
    'efectivo_divisa': 'Efectivo Divisa',
    'efectivo_moneda_legal': 'Efectivo Moneda Curso Legal',
  };
  return mapeo[tipoPago] || 'Efectivo';
}

// Obtener título del tipo de documento
function obtenerTituloDocumento(tipoDocumento: string): string {
  if (tipoDocumento === '01') return 'FACTURA';
  if (tipoDocumento === '02') return 'NOTA DE DEBITO';
  if (tipoDocumento === '03') return 'NOTA DE CREDITO';
  return 'DOCUMENTO';
}

export async function generateFacturaPDF(factura: FacturaDB, items: any[] = []) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let yPos = margin;

  // Determinar si es Nota de Débito/Crédito
  const esNota = factura.tipo_documento === '02' || factura.tipo_documento === '03';

  // ============================================
  // ENCABEZADO CON LOGO Y DATOS EMPRESA
  // ============================================

  const logoSize = 38; // Tamaño del logo reducido
  const facturaBoxWidth = 90; // Ancho del cuadro FACTURA

  // Logo GRU (Pulpo/Kraken con timón) - IZQUIERDA
  try {
    doc.addImage(GRU_LOGO_BASE64, 'PNG', margin, yPos, logoSize, logoSize);
  } catch (error) {
    // Fallback: círculo azul si hay error cargando el logo
    doc.setFillColor(41, 98, 160);
    doc.circle(margin + 15, yPos + 15, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('GRU', margin + 15, yPos + 18, { align: 'center' });
  }

  // Cuadro FACTURA - DERECHA (más pequeño)
  const tipoDoc = obtenerTituloDocumento(factura.tipo_documento);
  const facturaBoxHeight = 7; // Altura reducida
  doc.setFillColor(41, 98, 160);
  doc.rect(pageWidth - margin - facturaBoxWidth, yPos, facturaBoxWidth, facturaBoxHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(tipoDoc, pageWidth - margin - facturaBoxWidth/2, yPos + 5, { align: 'center' });

  // Datos del documento - DERECHA (debajo del cuadro azul)
  let yPosRight = yPos + facturaBoxHeight + 2;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');

  const fechaEmision = format(new Date(factura.fecha_emision), 'dd/MM/yyyy', { locale: es });
  const numeroDoc = factura.numero_documento.padStart(8, '0');

  doc.text(`N° de Documento: ${numeroDoc}`, pageWidth - margin - facturaBoxWidth + 2, yPosRight);
  doc.text(`Fecha de Emisión: ${fechaEmision}`, pageWidth - margin - facturaBoxWidth + 2, yPosRight + 4);
  doc.text(`Hora de Emisión: ${factura.hora_emision || '03:14:16 Pm'}`, pageWidth - margin - facturaBoxWidth + 2, yPosRight + 8);
  doc.text(`Fecha de Vencimiento: ${fechaEmision}`, pageWidth - margin - facturaBoxWidth + 2, yPosRight + 12);
  doc.text(`N° de Control: 00-${numeroDoc}`, pageWidth - margin - facturaBoxWidth + 2, yPosRight + 16);
  doc.text(`Fecha de Asignación: ${fechaEmision}`, pageWidth - margin - facturaBoxWidth + 2, yPosRight + 20);

  // Información de la empresa - CENTRO
  const textStartX = margin + logoSize + 5;

  doc.setTextColor(27, 58, 97); // Azul oscuro para el título
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('GRU CORPORACIÓN NAUTICA DE SERVICIOS, C.A.', textStartX, yPos + 6);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('R.I.F.: J-50725064-4', textStartX, yPos + 11);

  doc.setTextColor(200, 0, 0); // Rojo para la dirección
  doc.setFontSize(6);
  doc.text('Dirección Fiscal: AV LA ESTANCIA CON CALLE BENERITO BLOHM CC CIUDAD', textStartX, yPos + 16);
  doc.text('TAMANACO. PIRAMIDE INVERTIDA NIVEL 6 OF 610 URB CHUAO CARACAS (CHACAO)', textStartX, yPos + 20);
  doc.text('MIRANDA ZONA POSTAL 1060', textStartX, yPos + 24);

  doc.setTextColor(0, 0, 0);
  doc.text('Código de Operación: 0000', textStartX, yPos + 28);

  // Avanzar yPos al final del encabezado
  yPos = Math.max(yPos + logoSize + 2, yPosRight + 24);

  // Línea divisoria después del encabezado
  doc.setDrawColor(41, 98, 160);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 2;

  // ============================================
  // INFORMACIÓN DEL CLIENTE
  // ============================================

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 22, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Nombre o Razón Social:', margin + 2, yPos + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(factura.cliente_razon_social.toUpperCase(), margin + 45, yPos + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('RIF / C.I.:', margin + 2, yPos + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${factura.cliente_tipo_id}-${factura.cliente_numero_id}`, margin + 18, yPos + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Teléfono:', margin + 65, yPos + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(factura.cliente_telefono || '+58 212 9630812', margin + 82, yPos + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Dirección:', margin + 2, yPos + 18);
  doc.setFont('helvetica', 'normal');
  const direccion = factura.cliente_direccion || 'Av. principal las Mercedes Mncpio Miranda';
  doc.text(direccion, margin + 18, yPos + 18);

  yPos += 25;

  // ============================================
  // INFORMACIÓN PARA NOTAS DE DÉBITO/CRÉDITO
  // ============================================

  if (esNota && factura.numero_factura_afectada) {
    doc.setFillColor(255, 250, 205);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 15, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Aplica a Factura:', margin + 2, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(factura.numero_factura_afectada, margin + 30, yPos + 5);

    doc.setFont('helvetica', 'bold');
    doc.text('Fecha:', margin + 60, yPos + 5);
    doc.setFont('helvetica', 'normal');
    const fechaAfectada = factura.fecha_factura_afectada
      ? format(new Date(factura.fecha_factura_afectada), 'dd-MM-yyyy', { locale: es })
      : '';
    doc.text(fechaAfectada, margin + 72, yPos + 5);

    doc.setFont('helvetica', 'bold');
    doc.text('Monto:', margin + 95, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Bs. ${(factura.monto_factura_afectada || 0).toFixed(2)}`, margin + 110, yPos + 5);

    doc.setFont('helvetica', 'bold');
    doc.text('Motivo:', margin + 2, yPos + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(factura.comentario_factura_afectada || 'Otros', margin + 15, yPos + 10);

    yPos += 18;
  }

  // ============================================
  // TABLA DE ITEMS
  // ============================================

  const tableData = items.map((item, index) => [
    item.codigo_plu || `0123456789`,
    item.descripcion,
    item.cantidad.toString(),
    `${item.precio_unitario.toFixed(2)}`,
    `(${item.codigo_impuesto || 'G'})`,
    `${item.valor_total_item.toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [[
      'Código',
      'Descripción',
      'Cant.',
      'Precio\nUnitario Bs.',
      'Alícuota\nI.V.A.',
      'Total Bs.'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 98, 160], // Azul GRU para encabezados
      textColor: [255, 255, 255], // Blanco
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 2
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0],
      cellPadding: 1.5
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' }, // Código
      1: { cellWidth: 85 }, // Descripción
      2: { cellWidth: 15, halign: 'center' }, // Cant.
      3: { cellWidth: 25, halign: 'right' }, // Precio Unitario
      4: { cellWidth: 20, halign: 'center' }, // Alícuota
      5: { cellWidth: 25, halign: 'right' } // Total
    },
    margin: { left: margin, right: margin },
    styles: {
      lineColor: [100, 100, 100],
      lineWidth: 0.3,
      overflow: 'linebreak'
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255] // Sin color alternado
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ============================================
  // MARCA DE AGUA (LOGO GRANDE EN EL CENTRO)
  // ============================================

  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.04 })); // Opacidad reducida para marca de agua muy sutil
  try {
    // Logo como marca de agua centrado - Tamaño aumentado según referencia
    const watermarkSize = 200;
    doc.addImage(
      GRU_LOGO_BASE64,
      'PNG',
      (pageWidth - watermarkSize) / 2,
      yPos - 20, // Ajustado para centrar mejor en la página
      watermarkSize,
      watermarkSize
    );
  } catch (error) {
    // Fallback: círculo azul
    doc.setFillColor(41, 98, 160);
    doc.circle(pageWidth / 2, yPos + 40, 50, 'F');
  }
  doc.restoreGraphicsState();

  // ============================================
  // TOTALES
  // ============================================

  const subtotal = factura.subtotal || 0;
  const descuento = factura.total_descuento || 0;
  const exento = factura.monto_exento_total || 0;
  const baseImponible = factura.monto_gravado_total || subtotal;
  const alicuotaIVA = 16.00;
  const iva = factura.total_iva || (baseImponible * 0.16);
  const baseImponibleIGTF = 0;
  const alicuotaIGTF = 3.00;
  const igtf = 0;
  const totalAPagar = factura.total_a_pagar;

  const totalesIzq = [
    ['Subtotal', 'USD.', `${subtotal.toFixed(2)}`],
    ['Descuento', 'USD.', `0.00`],
    ['Exento', 'USD.', `0.00`],
    ['Base Imponible (G)', 'USD.', `${baseImponible.toFixed(2)}`],
    ['Alícuota I.V.A. (16.00%)', 'USD.', `${(baseImponible * 0.16).toFixed(2)}`],
    ['Base Imponible (IGTF)', 'USD.', `0.00`],
    ['Alícuota IGTF (3.00%)', 'USD.', `0.00`],
    ['Total a Pagar', 'USD.', `${(totalAPagar / (factura.tipo_cambio || 1)).toFixed(2)}`]
  ];

  const totalesDer = [
    ['Subtotal', 'BS.', `${subtotal.toFixed(2)}`],
    ['Descuento', 'BS.', `0.00`],
    ['Exento', 'BS.', `0.00`],
    ['Base Imponible (G)', 'BS.', `${baseImponible.toFixed(2)}`],
    ['Alícuota I.V.A. (16.00%)', 'BS.', `${iva.toFixed(2)}`],
    ['Base Imponible (IGTF)', 'BS.', `0.00`],
    ['Alícuota IGTF (3.00%)', 'BS.', `0.00`],
    ['Total a Pagar', 'BS.', `${totalAPagar.toFixed(2)}`]
  ];

  // Tabla izquierda (USD)
  autoTable(doc, {
    startY: yPos,
    body: totalesIzq,
    theme: 'plain',
    styles: {
      fontSize: 7,
      cellPadding: 1
    },
    columnStyles: {
      0: { cellWidth: 45, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 15, halign: 'left' },
      2: { cellWidth: 25, halign: 'right' }
    },
    margin: { left: margin },
    tableWidth: 85,
    didParseCell: function(data) {
      if (data.row.index === 7) { // Total a Pagar
        data.cell.styles.fillColor = [30, 58, 138];
        data.cell.styles.textColor = 255;
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // Tabla derecha (BS)
  autoTable(doc, {
    startY: yPos,
    body: totalesDer,
    theme: 'plain',
    styles: {
      fontSize: 7,
      cellPadding: 1
    },
    columnStyles: {
      0: { cellWidth: 45, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 15, halign: 'left' },
      2: { cellWidth: 25, halign: 'right' }
    },
    margin: { left: pageWidth / 2 + 5 },
    tableWidth: 85,
    didParseCell: function(data) {
      if (data.row.index === 7) { // Total a Pagar
        data.cell.styles.fillColor = [30, 58, 138];
        data.cell.styles.textColor = 255;
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 5;

  // Tasa BCV
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Tasa B.C.V a la fecha de emisión: Bs. ${(factura.tipo_cambio || 136.8900).toFixed(4)}`, pageWidth / 2, yPos, { align: 'center' });

  yPos += 10;

  // ============================================
  // PIE DE PÁGINA - INFORMACIÓN LEGAL
  // ============================================

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  const textoLegal = 'Este pago estará sujeto al cobro adicional del 3% del Impuesto a las Grandes Transacciones Financieras (IGTF), de conformidad con la Providencia Administrativa SNAT/2022/000013 publicada en la G.O.N 42.339 del 17-03-2022, en caso de ser cancelado en divisas. No aplica en pago en Bs.';
  const lineasLegal = doc.splitTextToSize(textoLegal, pageWidth - 2 * margin);
  doc.text(lineasLegal, margin, yPos);

  yPos += 8;

  const textoRetencion = 'Este documento no se constituye en medio de pago frente a terceros, (Retención General), (Retención de ISLR) establecido en la G.O.N. N° 6.152 de fecha 18/11/2014 o la aplicación, según lo establecido en el artículo 13 numeral 14 de la Providencia Administrativa SNAT /2011/0071 ( ) en concordancia con el artículo 128 de la Ley del Banco Central de Venezuela (BCV), artículo 25 de la Ley que establece el Impuesto al Valor Agregado (IVA) y 36 del Reglamento de Ley de Impuesto al Valor Agregado (RLIVA).';
  const lineasRetencion = doc.splitTextToSize(textoRetencion, pageWidth - 2 * margin);
  doc.text(lineasRetencion, margin, yPos);

  yPos += 12;

  // ============================================
  // CÓDIGO QR Y VERIFICACIÓN
  // ============================================

  // Área del QR
  doc.setFillColor(200, 200, 200);
  doc.rect(margin, yPos, 20, 20, 'F');
  doc.setFontSize(6);
  doc.setTextColor(0, 0, 0);
  doc.text('QR', margin + 10, yPos + 10, { align: 'center' });

  // Texto de documento emitido conforme
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENTO EMITIDO CONFORME A LA PROVIDENCIA ADMINISTRATIVA SNAT /2024/000102', margin + 25, yPos + 5);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('THE FACTORY HKA VENEZUELA, C.A. J-402385358, AV DON DIEGO CISNEROS EDIF SIEMENS TORRE SUR PISO 2', margin + 25, yPos + 10);
  doc.text('OF SN URB LOS RUICES CARACAS MIRANDA ZONA POSTAL 1071 +58(212)902-0811. Imprenta Digital Autorizada mediante Providencia SENATRINT/000005', margin + 25, yPos + 14);
  doc.text('de fecha 09/09/2022 Nros. de Control desde el 00-00000001 hasta 00-00010000 generados digitalmente en fecha 14/04/2023 11:47:59 AM.', margin + 25, yPos + 18);

  // Guardar PDF
  const tipoDocTexto = factura.tipo_documento === '01' ? 'Factura' :
                       factura.tipo_documento === '02' ? 'NotaDebito' :
                       factura.tipo_documento === '03' ? 'NotaCredito' : 'Documento';

  doc.save(`${tipoDocTexto}_${factura.serie}_${factura.numero_documento}.pdf`);
}
