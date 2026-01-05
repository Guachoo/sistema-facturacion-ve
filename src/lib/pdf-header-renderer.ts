import jsPDF from 'jspdf';
import type { FacturaDB } from '@/api/facturas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { GRU_LOGO_BASE64 } from './logo-base64';
import { PDF_LAYOUT, PDF_COLORS } from './pdf-layout-constants';

/**
 * Trunca texto para que quepa en un ancho específico
 */
function truncateToWidth(doc: jsPDF, text: string, maxWidth: number): string {
  const textWidth = doc.getTextWidth(text);
  if (textWidth <= maxWidth) {
    return text;
  }

  let truncated = text;
  while (doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }

  return truncated + '...';
}

/**
 * Divide texto en múltiples líneas respetando un máximo
 */
function wrapMaxLines(doc: jsPDF, text: string, maxWidth: number, maxLines: number): string[] {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];

  if (lines.length <= maxLines) {
    return lines;
  }

  const truncatedLines = lines.slice(0, maxLines);
  const lastLine = truncatedLines[maxLines - 1];
  truncatedLines[maxLines - 1] = truncateToWidth(doc, lastLine, maxWidth);

  return truncatedLines;
}

/**
 * Dibuja una caja de debug
 */
function drawBoxDebug(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  color: [number, number, number] = [255, 0, 0]
) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);

  doc.setFontSize(6);
  doc.setTextColor(...color);
  doc.text(label, x + 1, y + 2);
}

/**
 * Renderiza el encabezado completo del PDF con cajas fijas
 */
export function renderHeaderFixed(doc: jsPDF, factura: FacturaDB, debugMode: boolean = false) {
  const { LOGO_BOX, EMPRESA_BOX, FACTURA_BOX, SEPARATOR_LINE, CLIENT_BOX } = PDF_LAYOUT;

  // ========================================
  // DEBUG: Dibujar cajas si está habilitado
  // ========================================
  if (debugMode) {
    drawBoxDebug(doc, LOGO_BOX.x, LOGO_BOX.y, LOGO_BOX.w, LOGO_BOX.h, 'LOGO', [0, 0, 255]);
    drawBoxDebug(doc, EMPRESA_BOX.x, EMPRESA_BOX.y, EMPRESA_BOX.w, EMPRESA_BOX.h, 'EMPRESA', [0, 255, 0]);
    drawBoxDebug(doc, FACTURA_BOX.x, FACTURA_BOX.y, FACTURA_BOX.w, FACTURA_BOX.h, 'FACTURA', [255, 0, 0]);
    drawBoxDebug(doc, CLIENT_BOX.x, CLIENT_BOX.y, CLIENT_BOX.w, CLIENT_BOX.h, 'CLIENTE', [255, 165, 0]);
  }

  // ========================================
  // 1) CAJA LOGO (izquierda)
  // ========================================
  try {
    // Calcular tamaño para fit/contain dentro de la caja
    const logoAspectRatio = 1; // Logo es cuadrado
    let logoW = LOGO_BOX.w;
    let logoH = LOGO_BOX.h;

    // Centrar logo dentro de la caja
    const logoX = LOGO_BOX.x + (LOGO_BOX.w - logoW) / 2;
    const logoY = LOGO_BOX.y + (LOGO_BOX.h - logoH) / 2;

    doc.addImage(GRU_LOGO_BASE64, 'PNG', logoX, logoY, logoW, logoH);
  } catch (error) {
    console.error('Error al cargar logo:', error);
  }

  // ========================================
  // 2) CAJA EMPRESA (centro)
  // ========================================
  const empresaCenterX = EMPRESA_BOX.x + EMPRESA_BOX.w / 2;
  let yEmpresa = EMPRESA_BOX.y + 5;

  // 2.1 Título
  doc.setTextColor(...PDF_COLORS.DARK_BLUE);
  doc.setFont('helvetica', EMPRESA_BOX.TITLE.fontStyle);
  doc.setFontSize(EMPRESA_BOX.TITLE.fontSize);

  const titulo = 'GRU CORPORACIÓN NAUTICA DE SERVICIOS, C.A.';
  const tituloTruncado = truncateToWidth(doc, titulo, EMPRESA_BOX.w);
  doc.text(tituloTruncado, empresaCenterX, yEmpresa, { align: 'center' });

  yEmpresa += 5;

  // 2.2 RIF
  doc.setTextColor(...PDF_COLORS.BLACK);
  doc.setFont('helvetica', EMPRESA_BOX.RIF.fontStyle);
  doc.setFontSize(EMPRESA_BOX.RIF.fontSize);
  doc.text('R.I.F.: J-50725064-4', empresaCenterX, yEmpresa, { align: 'center' });

  yEmpresa += 5;

  // 2.3 Dirección Fiscal (máx 2 líneas)
  doc.setFontSize(EMPRESA_BOX.ADDRESS.fontSize);
  const addressText = 'Dirección Fiscal: AV LA ESTANCIA CON CALLE BENERITO BLOHM CC CIUDAD TAMANACO. PIRAMIDE INVERTIDA NIVEL 6 OF 610 URB CHUAO CARACAS (CHACAO) MIRANDA ZONA POSTAL 1060';

  doc.setTextColor(...PDF_COLORS.RED);
  const addressLines = wrapMaxLines(doc, addressText, EMPRESA_BOX.w, EMPRESA_BOX.ADDRESS.maxLines);

  addressLines.forEach((line, i) => {
    doc.text(line, empresaCenterX, yEmpresa + i * 4, { align: 'center' });
  });

  yEmpresa += addressLines.length * 4 + 2;

  // 2.4 Código de Operación
  doc.setTextColor(...PDF_COLORS.BLACK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(EMPRESA_BOX.CODE.fontSize);
  doc.text('Código de Operación: ', empresaCenterX - 8, yEmpresa, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('0000', empresaCenterX + 18, yEmpresa);

  // ========================================
  // 3) CAJA FACTURA (derecha)
  // ========================================
  const facturaInnerX = FACTURA_BOX.x + FACTURA_BOX.padding;
  const facturaCenterX = FACTURA_BOX.x + FACTURA_BOX.w / 2;
  let yFactura = FACTURA_BOX.y + FACTURA_BOX.padding;

  // 3.1 Título "FACTURA" CENTRADO
  doc.setTextColor(...PDF_COLORS.PRIMARY_BLUE);
  doc.setFont('helvetica', FACTURA_BOX.TITLE.fontStyle);
  doc.setFontSize(FACTURA_BOX.TITLE.fontSize);
  const tipoDoc = getTipoDocumento(factura.tipo_documento);
  doc.text(tipoDoc, facturaCenterX, yFactura + 4, { align: 'center' });

  yFactura += 8;

  // 3.2 Campos del documento (label + valor en la misma línea)
  const fechaEmision = format(new Date(factura.fecha_emision), 'dd/MM/yyyy', { locale: es });
  const numeroDoc = factura.numero_documento || '00000001';

  const campos = [
    { label: 'N° de Documento:', value: numeroDoc },
    { label: 'Fecha de Emisión:', value: fechaEmision },
    { label: 'Hora de Emisión:', value: factura.hora_emision || '03:14:16 Pm' },
    { label: 'Fecha de Vencimiento:', value: fechaEmision },
    { label: 'N° de Control:', value: `00-${numeroDoc}`, valueRed: true },
    { label: 'Fecha de Asignación:', value: fechaEmision },
  ];

  // Calcular tamaño de letra que permita que todo quepa
  let fontSize = FACTURA_BOX.FIELDS.fontSize;
  const availableWidth = FACTURA_BOX.w - (FACTURA_BOX.padding * 2);

  // Probar si cabe con el tamaño normal
  doc.setFontSize(fontSize);
  let maxWidth = 0;
  campos.forEach((campo) => {
    doc.setFont('helvetica', 'normal');
    const labelWidth = doc.getTextWidth(campo.label);
    doc.setFont('helvetica', 'bold');
    const valueWidth = doc.getTextWidth(campo.value);
    const totalWidth = labelWidth + valueWidth + 0.5; // Espacio mínimo
    if (totalWidth > maxWidth) maxWidth = totalWidth;
  });

  // Si no cabe, reducir tamaño
  while (maxWidth > availableWidth && fontSize > FACTURA_BOX.FIELDS.fallbackSize) {
    fontSize -= 0.5;
    doc.setFontSize(fontSize);
    maxWidth = 0;
    campos.forEach((campo) => {
      doc.setFont('helvetica', 'normal');
      const labelWidth = doc.getTextWidth(campo.label);
      doc.setFont('helvetica', 'bold');
      const valueWidth = doc.getTextWidth(campo.value);
      const totalWidth = labelWidth + valueWidth + 0.5;
      if (totalWidth > maxWidth) maxWidth = totalWidth;
    });
  }

  // Calcular altura total del texto para el fondo
  const lineHeight = fontSize * 0.75; // ESPACIO ULTRA MÍNIMO entre líneas
  const totalTextHeight = campos.length * lineHeight + 2; // +2 padding vertical
  const yStartText = yFactura - 1;

  // Dibujar fondo gris claro SOLO en el área del texto
  doc.setFillColor(240, 240, 240); // Gris muy claro
  doc.rect(FACTURA_BOX.x, yStartText, FACTURA_BOX.w, totalTextHeight, 'F');

  // Renderizar cada campo en su línea (JUSTIFICADO A LA IZQUIERDA)
  doc.setFontSize(fontSize);

  campos.forEach((campo) => {
    // Label (normal, negro)
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_COLORS.BLACK);
    const labelWidth = doc.getTextWidth(campo.label);
    doc.text(campo.label, facturaInnerX, yFactura);

    // Valor (bold, negro o rojo) pegado al label SIN espacio
    doc.setFont('helvetica', 'bold');
    if (campo.valueRed) {
      doc.setTextColor(...PDF_COLORS.RED);
    } else {
      doc.setTextColor(...PDF_COLORS.BLACK);
    }
    doc.text(campo.value, facturaInnerX + labelWidth + 0.5, yFactura);

    yFactura += lineHeight; // Siguiente línea
  });

  // ========================================
  // 4) LÍNEA SEPARADORA
  // ========================================
  doc.setDrawColor(...PDF_COLORS.PRIMARY_BLUE);
  doc.setLineWidth(SEPARATOR_LINE.thickness);
  doc.line(SEPARATOR_LINE.x, SEPARATOR_LINE.y, SEPARATOR_LINE.x + SEPARATOR_LINE.w, SEPARATOR_LINE.y);

  // ========================================
  // 5) CAJA CLIENTE
  // ========================================
  // Fondo gris
  doc.setFillColor(...CLIENT_BOX.BG_COLOR);
  doc.rect(CLIENT_BOX.x, CLIENT_BOX.y, CLIENT_BOX.w, CLIENT_BOX.h, 'F');

  let yCliente = CLIENT_BOX.y + 5;
  const xCliente = CLIENT_BOX.x + 2;

  doc.setFontSize(CLIENT_BOX.FIELDS.labelSize);
  doc.setTextColor(...PDF_COLORS.BLACK);

  // Nombre o Razón Social (misma línea con 3 espacios)
  doc.setFont('helvetica', 'bold');
  doc.text('Nombre o Razón Social:', xCliente, yCliente);
  doc.setFont('helvetica', 'normal');
  const labelWidth1 = doc.getTextWidth('Nombre o Razón Social:');
  const spacing3 = doc.getTextWidth('   '); // Tres espacios
  const maxRazonSocialWidth = CLIENT_BOX.w - labelWidth1 - spacing3 - 4;
  const razonSocial = truncateToWidth(doc, factura.cliente_razon_social.toUpperCase(), maxRazonSocialWidth);
  doc.text(razonSocial, xCliente + labelWidth1 + spacing3, yCliente);

  yCliente += 5;

  // RIF / C.I. (misma línea con 1 espacio)
  doc.setFont('helvetica', 'bold');
  doc.text('RIF / C.I.:', xCliente, yCliente);
  doc.setFont('helvetica', 'normal');
  const labelWidth2 = doc.getTextWidth('RIF / C.I.:');
  const spacing1 = doc.getTextWidth(' '); // Un espacio
  doc.text(`${factura.cliente_tipo_id}-${factura.cliente_numero_id}`, xCliente + labelWidth2 + spacing1, yCliente);

  yCliente += 5;

  // Teléfono (misma línea con 2 espacios)
  doc.setFont('helvetica', 'bold');
  doc.text('Teléfono:', xCliente, yCliente);
  doc.setFont('helvetica', 'normal');
  const labelWidth3 = doc.getTextWidth('Teléfono:');
  const spacing2 = doc.getTextWidth('  '); // Dos espacios
  doc.text(factura.cliente_telefono || '+58 212 9630812', xCliente + labelWidth3 + spacing2, yCliente);

  yCliente += 5;

  // Dirección (primera línea con label y 2 espacios, segunda línea al inicio)
  doc.setFont('helvetica', 'bold');
  doc.text('Dirección:', xCliente, yCliente);
  doc.setFont('helvetica', 'normal');
  const labelWidth4 = doc.getTextWidth('Dirección:');
  const direccion = factura.cliente_direccion || 'Av. principal las Mercedes Mncpio Miranda';
  const maxDireccionWidth = CLIENT_BOX.w - labelWidth4 - spacing2 - 4;
  const direccionLines = wrapMaxLines(doc, direccion, maxDireccionWidth, CLIENT_BOX.DIRECCION_MAX_LINES);

  direccionLines.forEach((line, i) => {
    if (i === 0) {
      // Primera línea al lado del label con 2 espacios
      doc.text(line, xCliente + labelWidth4 + spacing2, yCliente);
    } else {
      // Líneas siguientes alineadas al inicio (sin el label)
      doc.text(line, xCliente, yCliente + i * 4);
    }
  });
}

/**
 * Helper: Obtener título del tipo de documento
 */
function getTipoDocumento(tipo: string): string {
  if (tipo === '01') return 'FACTURA';
  if (tipo === '02') return 'NOTA DE DEBITO';
  if (tipo === '03') return 'NOTA DE CREDITO';
  return 'DOCUMENTO';
}
