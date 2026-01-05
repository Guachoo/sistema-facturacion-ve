import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FacturaDB } from '@/api/facturas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { GRU_LOGO_BASE64 } from './logo-base64';
import { PDF_LAYOUT, PDF_COLORS, PDF_FONTS, formatBS, formatUSD } from './pdf-layout-constants';
import { renderHeaderFixed } from './pdf-header-renderer';

// ============================================
// HELPERS DE TEXTO
// ============================================

/**
 * Trunca texto para que quepa en un ancho específico
 * @param doc - Documento jsPDF
 * @param text - Texto a truncar
 * @param maxWidth - Ancho máximo en mm
 * @returns Texto truncado con "..." si es necesario
 */
function truncateToWidth(doc: jsPDF, text: string, maxWidth: number): string {
  const textWidth = doc.getTextWidth(text);
  if (textWidth <= maxWidth) {
    return text;
  }

  // Truncar gradualmente
  let truncated = text;
  while (doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }

  return truncated + '...';
}

/**
 * Divide texto en múltiples líneas respetando un máximo
 * @param doc - Documento jsPDF
 * @param text - Texto a dividir
 * @param maxWidth - Ancho máximo en mm
 * @param maxLines - Número máximo de líneas
 * @returns Array de líneas (truncadas si exceden maxLines)
 */
function wrapMaxLines(doc: jsPDF, text: string, maxWidth: number, maxLines: number): string[] {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];

  if (lines.length <= maxLines) {
    return lines;
  }

  // Si excede maxLines, truncar la última línea
  const truncatedLines = lines.slice(0, maxLines);
  const lastLine = truncatedLines[maxLines - 1];
  truncatedLines[maxLines - 1] = truncateToWidth(doc, lastLine, maxWidth - doc.getTextWidth('...'));

  if (!truncatedLines[maxLines - 1].endsWith('...')) {
    truncatedLines[maxLines - 1] += '...';
  }

  return truncatedLines;
}

/**
 * Dibuja una caja de debug para visualizar layouts
 * @param doc - Documento jsPDF
 * @param x - Posición X en mm
 * @param y - Posición Y en mm
 * @param w - Ancho en mm
 * @param h - Alto en mm
 * @param label - Etiqueta de la caja
 * @param color - Color RGB de la caja [r, g, b]
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

  // Etiqueta
  doc.setFontSize(6);
  doc.setTextColor(...color);
  doc.text(label, x + 1, y + 2);
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

export async function generateFacturaPDF(
  factura: FacturaDB,
  items: any[] = [],
  debugMode: boolean = false
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Dibujar guías de debug si está habilitado
  if (debugMode) {
    drawDebugGuides(doc, pageWidth, pageHeight);
  }

  // Renderizar ENCABEZADO con cajas fijas
  renderHeaderFixed(doc, factura, debugMode);
  renderItemsTable(doc, items, pageWidth);
  renderWatermark(doc, pageWidth, pageHeight);
  const totalsY = renderTotals(doc, factura, items, pageWidth, pageHeight);
  renderFooter(doc, pageWidth, pageHeight, totalsY);

  // Descargar el PDF
  const numeroDoc = factura.numero_documento || '00000001';
  const serie = factura.serie || '001';
  const filename = `Factura_${serie}_${numeroDoc}.pdf`;
  doc.save(filename);

  // Retornar el PDF
  return doc;
}

// ============================================
// ENCABEZADO
// ============================================

function renderHeader(doc: jsPDF, factura: FacturaDB, pageWidth: number) {
  const { HEADER, COMPANY, FACTURA_BOX, DOC_DATA, SEPARATOR_LINE } = PDF_LAYOUT;

  // LOGO (izquierda)
  try {
    doc.addImage(
      GRU_LOGO_BASE64,
      'PNG',
      HEADER.LOGO_X,
      HEADER.LOGO_Y,
      HEADER.LOGO_SIZE,
      HEADER.LOGO_SIZE
    );
  } catch (error) {
    console.error('Error al cargar el logo:', error);
  }

  // INFORMACIÓN DE LA EMPRESA (centro)
  doc.setTextColor(...PDF_COLORS.DARK_BLUE);
  doc.setFontSize(PDF_FONTS.COMPANY_TITLE.size);
  doc.setFont('helvetica', PDF_FONTS.COMPANY_TITLE.style);
  doc.text('GRU CORPORACIÓN NAUTICA DE SERVICIOS, C.A.', COMPANY.TEXT_START_X, COMPANY.TITLE_Y);

  doc.setTextColor(...PDF_COLORS.BLACK);
  doc.setFontSize(PDF_FONTS.COMPANY_RIF.size);
  doc.setFont('helvetica', PDF_FONTS.COMPANY_RIF.style);
  doc.text('R.I.F.: J-50725064-4', COMPANY.TEXT_START_X, COMPANY.RIF_Y);

  doc.setTextColor(...PDF_COLORS.RED);
  doc.setFontSize(PDF_FONTS.COMPANY_ADDRESS.size);
  doc.text(
    'Dirección Fiscal: AV LA ESTANCIA CON CALLE BENERITO BLOHM CC CIUDAD',
    COMPANY.TEXT_START_X,
    COMPANY.ADDRESS_LINE1_Y
  );
  doc.text(
    'TAMANACO. PIRAMIDE INVERTIDA NIVEL 6 OF 610 URB CHUAO CARACAS (CHACAO)',
    COMPANY.TEXT_START_X,
    COMPANY.ADDRESS_LINE2_Y
  );
  doc.text('MIRANDA ZONA POSTAL 1060', COMPANY.TEXT_START_X, COMPANY.ADDRESS_LINE3_Y);

  doc.setTextColor(...PDF_COLORS.BLACK);
  doc.text('Código de Operación: 0000', COMPANY.TEXT_START_X, COMPANY.CODE_Y);

  // CUADRO "FACTURA" (derecha)
  const facturaBoxX = pageWidth - PDF_LAYOUT.PAGE_MARGIN - FACTURA_BOX.WIDTH;
  const tipoDoc = getTipoDocumento(factura.tipo_documento);

  doc.setFillColor(...PDF_COLORS.PRIMARY_BLUE);
  doc.rect(facturaBoxX, FACTURA_BOX.Y, FACTURA_BOX.WIDTH, FACTURA_BOX.HEIGHT, 'F');

  doc.setTextColor(...PDF_COLORS.WHITE);
  doc.setFontSize(FACTURA_BOX.TITLE_FONT_SIZE);
  doc.setFont('helvetica', 'bold');
  doc.text(tipoDoc, facturaBoxX + FACTURA_BOX.WIDTH / 2, FACTURA_BOX.Y + 5, { align: 'center' });

  // DATOS DEL DOCUMENTO (debajo del cuadro FACTURA)
  doc.setTextColor(...PDF_COLORS.BLACK);
  doc.setFontSize(DOC_DATA.FONT_SIZE);
  doc.setFont('helvetica', 'normal');

  const fechaEmision = format(new Date(factura.fecha_emision), 'dd/MM/yyyy', { locale: es });
  const numeroDoc = factura.numero_documento || '00000001';
  const docDataX = facturaBoxX + 2;

  let docY = DOC_DATA.START_Y;
  doc.text(`N° de Documento: ${numeroDoc}`, docDataX, docY);
  docY += DOC_DATA.LINE_HEIGHT;
  doc.text(`Fecha de Emisión: ${fechaEmision}`, docDataX, docY);
  docY += DOC_DATA.LINE_HEIGHT;
  doc.text(`Hora de Emisión: ${factura.hora_emision || '03:14:16 Pm'}`, docDataX, docY);
  docY += DOC_DATA.LINE_HEIGHT;
  doc.text(`Fecha de Vencimiento: ${fechaEmision}`, docDataX, docY);
  docY += DOC_DATA.LINE_HEIGHT;
  doc.text(`N° de Control: 00-${numeroDoc}`, docDataX, docY);
  docY += DOC_DATA.LINE_HEIGHT;
  doc.text(`Fecha de Asignación: ${fechaEmision}`, docDataX, docY);

  // LÍNEA SEPARADORA
  doc.setDrawColor(...PDF_COLORS.PRIMARY_BLUE);
  doc.setLineWidth(SEPARATOR_LINE.THICKNESS);
  doc.line(
    PDF_LAYOUT.PAGE_MARGIN,
    SEPARATOR_LINE.Y,
    pageWidth - PDF_LAYOUT.PAGE_MARGIN,
    SEPARATOR_LINE.Y
  );
}

// ============================================
// INFORMACIÓN DEL CLIENTE
// ============================================

function renderClientInfo(doc: jsPDF, factura: FacturaDB, pageWidth: number) {
  const { CLIENT } = PDF_LAYOUT;
  const margin = PDF_LAYOUT.PAGE_MARGIN;

  // Fondo gris
  doc.setFillColor(...CLIENT.BG_COLOR);
  doc.rect(margin, CLIENT.Y, pageWidth - 2 * margin, CLIENT.HEIGHT, 'F');

  doc.setFontSize(CLIENT.FONT_SIZE);
  doc.setTextColor(...PDF_COLORS.BLACK);

  let y = CLIENT.Y + 5;

  // Nombre o Razón Social
  doc.setFont('helvetica', 'bold');
  doc.text('Nombre o Razón Social:', margin + 2, y);
  doc.setFont('helvetica', 'normal');
  const razonSocial = factura.cliente_razon_social.toUpperCase();
  doc.text(razonSocial.substring(0, 50), margin + 42, y);

  y += 5;

  // RIF / C.I.
  doc.setFont('helvetica', 'bold');
  doc.text('RIF / C.I.:', margin + 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${factura.cliente_tipo_id}-${factura.cliente_numero_id}`, margin + 18, y);

  // Teléfono
  doc.setFont('helvetica', 'bold');
  doc.text('Teléfono:', margin + 60, y);
  doc.setFont('helvetica', 'normal');
  doc.text(factura.cliente_telefono || '+58 212 9630812', margin + 75, y);

  y += 5;

  // Dirección
  doc.setFont('helvetica', 'bold');
  doc.text('Dirección:', margin + 2, y);
  doc.setFont('helvetica', 'normal');
  const direccion = factura.cliente_direccion || 'Av. principal las Mercedes Mncpio Miranda';
  const direccionTruncada = direccion.length > 80 ? direccion.substring(0, 80) + '...' : direccion;
  doc.text(direccionTruncada, margin + 18, y);
}

// ============================================
// TABLA DE ITEMS
// ============================================

function renderItemsTable(doc: jsPDF, items: any[], pageWidth: number) {
  const { TABLE } = PDF_LAYOUT;
  const margin = PDF_LAYOUT.PAGE_MARGIN;

  const tableData = items.map((item) => [
    item.codigo_plu || '0123456789',
    item.descripcion || 'DESCRIPCION DE PRODUCTO O SERVICIO 1',
    item.cantidad?.toString() || '1',
    formatUSD(item.precio_unitario || 500.0),
    `(${item.codigo_impuesto || 'G'})`,
    formatUSD(item.valor_total_item || 500.0),
  ]);

  autoTable(doc, {
    startY: TABLE.START_Y,
    head: [['Código', 'Descripción', 'Cant.', 'Precio\nUnitario Bs.', 'Alícuota\nI.V.A.', 'Total Bs.']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: TABLE.HEADER_BG,
      textColor: TABLE.HEADER_TEXT_COLOR,
      fontSize: TABLE.HEADER_FONT_SIZE,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: TABLE.BODY_FONT_SIZE,
      textColor: PDF_COLORS.BLACK,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 85 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 25, halign: 'right' },
    },
    margin: { left: margin, right: margin },
    styles: {
      lineColor: PDF_COLORS.GRAY,
      lineWidth: 0.3,
    },
  });
}

// ============================================
// MARCA DE AGUA
// ============================================

function renderWatermark(doc: jsPDF, pageWidth: number, pageHeight: number) {
  const { WATERMARK } = PDF_LAYOUT;

  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: WATERMARK.OPACITY }));

  try {
    const x = (pageWidth - WATERMARK.SIZE) / 2;
    const y = pageHeight / 2 - WATERMARK.SIZE / 2;
    doc.addImage(GRU_LOGO_BASE64, 'PNG', x, y, WATERMARK.SIZE, WATERMARK.SIZE);
  } catch (error) {
    console.error('Error al renderizar marca de agua:', error);
  }

  doc.restoreGraphicsState();
}

// ============================================
// TOTALES (DUAL CURRENCY)
// ============================================

function renderTotals(
  doc: jsPDF,
  factura: FacturaDB,
  items: any[],
  pageWidth: number,
  pageHeight: number
): number {
  const finalY = (doc as any).lastAutoTable?.finalY || 150;
  let yPos = finalY + 15;

  // Tasa BCV
  const tasaBCV = factura.tasa_bcv || 301.3709;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PDF_COLORS.BLACK);
  doc.text(
    `Tasa B.C.V a la fecha de emisión: Bs. ${formatBS(tasaBCV)}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );

  yPos += 8;

  // Calcular totales
  const subtotal = items.reduce((sum, item) => sum + (item.valor_total_item || 0), 0);
  const descuento = 0;
  const exento = 0;
  const baseImponible = subtotal - descuento - exento;
  const iva = baseImponible * 0.16;
  const igtf = 0;
  const totalUSD = baseImponible + iva + igtf;
  const totalBS = totalUSD * tasaBCV;

  const { TOTALS } = PDF_LAYOUT;

  // Etiquetas izquierda
  const labels = [
    'Subtotal',
    'Descuento',
    'Exento',
    'Base Imponible (G)',
    'Alícuota I.V.A. (16.00%)',
    'Base Imponible (IGTF)',
    'Alícuota IGTF (3.00%)',
  ];

  doc.setFontSize(TOTALS.FONT_SIZE);
  doc.setFont('helvetica', 'normal');

  labels.forEach((label, i) => {
    const y = yPos + i * TOTALS.LINE_HEIGHT;
    doc.setTextColor(...PDF_COLORS.BLACK);
    doc.text(label, TOTALS.LABEL_X, y);

    // Columna USD
    doc.text('USD.', TOTALS.USD_COL_X, y);
    const valueUSD = i === 0 ? subtotal : i === 3 ? baseImponible : i === 4 ? iva : 0;
    doc.text(formatUSD(valueUSD), TOTALS.USD_COL_X + 15, y);

    // Columna BS
    doc.text('BS.', TOTALS.BS_COL_X, y);
    const valueBS = valueUSD * tasaBCV;
    doc.text(formatBS(valueBS), TOTALS.BS_COL_X + 15, y);
  });

  yPos += labels.length * TOTALS.LINE_HEIGHT + 2;

  // Fila "Total a Pagar" con fondo azul
  doc.setFillColor(...TOTALS.TOTAL_PAGAR_BG);
  doc.rect(TOTALS.LABEL_X - 2, yPos - 4, pageWidth - TOTALS.LABEL_X - 8, TOTALS.TOTAL_PAGAR_HEIGHT, 'F');

  doc.setTextColor(...TOTALS.TOTAL_PAGAR_TEXT);
  doc.setFont('helvetica', 'bold');
  doc.text('Total a Pagar', TOTALS.LABEL_X, yPos);
  doc.text('USD.', TOTALS.USD_COL_X, yPos);
  doc.text(formatUSD(totalUSD), TOTALS.USD_COL_X + 15, yPos);
  doc.text('BS.', TOTALS.BS_COL_X, yPos);
  doc.text(formatBS(totalBS), TOTALS.BS_COL_X + 15, yPos);

  return yPos + 10;
}

// ============================================
// PIE DE PÁGINA
// ============================================

function renderFooter(doc: jsPDF, pageWidth: number, pageHeight: number, startY: number) {
  let yPos = startY;

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.BLACK);

  const legalText1 =
    'Este pago estará sujeto al cobro adicional del 3% del Impuesto a las Grandes Transacciones Financieras (IGTF), de conformidad con la Providencia Administrativa SNAT/2022/000013 publicada en la G.O.N 42.339 del 17-03-2022, en caso de ser cancelado en divisas. No aplica en pago en Bs.';

  const legalText2 =
    'Este documento no se constituye en medio de pago frente a terceros, (Retención General), (Retención de ISLR) establecido en la G.O.N. N° 6.152 de fecha 18/11/2014 o la aplicación, según lo establecido en el artículo 13 numeral 14 de la Providencia Administrativa SNAT /2011/0071 ( ) en concordancia con el artículo 128 de la Ley del Banco Central de Venezuela (BCV), artículo 25 de la Ley que establece el Impuesto al Valor Agregado (IVA) y 36 del Reglamento de Ley de Impuesto al Valor Agregado (RLIVA).';

  const lines1 = doc.splitTextToSize(legalText1, pageWidth - 20);
  const lines2 = doc.splitTextToSize(legalText2, pageWidth - 20);

  lines1.forEach((line: string) => {
    doc.text(line, 10, yPos);
    yPos += 3;
  });

  yPos += 2;

  lines2.forEach((line: string) => {
    doc.text(line, 10, yPos);
    yPos += 3;
  });

  yPos += 5;

  // Bloque final con QR
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENTO EMITIDO CONFORME A LA PROVIDENCIA ADMINISTRATIVA SNAT /2024/000102', pageWidth / 2, yPos, {
    align: 'center',
  });

  yPos += 4;

  doc.setFont('helvetica', 'normal');
  const footerText =
    'THE FACTORY HKA VENEZUELA, C.A. J-402385358, AV DON DIEGO CISNEROS EDIF SIEMENS TORRE SUR PISO 2';
  const footerText2 =
    'OF SN URB LOS RUICES CARACAS MIRANDA ZONA POSTAL 1071 +58(212)902-0811. Imprenta Digital Autorizada mediante Providencia SENATRINT/000005';
  const footerText3 =
    'de fecha 09/09/2022 Nros. de Control desde el 00-00000001 hasta 00-00010000 generados digitalmente en fecha 14/04/2023 11:47:59 AM.';

  doc.text(footerText, pageWidth / 2, yPos, { align: 'center' });
  yPos += 3;
  doc.text(footerText2, pageWidth / 2, yPos, { align: 'center' });
  yPos += 3;
  doc.text(footerText3, pageWidth / 2, yPos, { align: 'center' });
}

// ============================================
// DEBUG GUIDES
// ============================================

function drawDebugGuides(doc: jsPDF, pageWidth: number, pageHeight: number) {
  doc.setDrawColor(255, 0, 0);
  doc.setLineWidth(0.1);

  // Márgenes
  doc.rect(PDF_LAYOUT.PAGE_MARGIN, PDF_LAYOUT.PAGE_MARGIN, pageWidth - 2 * PDF_LAYOUT.PAGE_MARGIN, pageHeight - 2 * PDF_LAYOUT.PAGE_MARGIN);

  // Header
  doc.rect(PDF_LAYOUT.PAGE_MARGIN, PDF_LAYOUT.HEADER.TOP, pageWidth - 2 * PDF_LAYOUT.PAGE_MARGIN, PDF_LAYOUT.HEADER.HEIGHT);

  // Client box
  doc.rect(PDF_LAYOUT.PAGE_MARGIN, PDF_LAYOUT.CLIENT.Y, pageWidth - 2 * PDF_LAYOUT.PAGE_MARGIN, PDF_LAYOUT.CLIENT.HEIGHT);
}

// ============================================
// HELPERS
// ============================================

function getTipoDocumento(tipo: string): string {
  if (tipo === '01') return 'FACTURA';
  if (tipo === '02') return 'NOTA DE DEBITO';
  if (tipo === '03') return 'NOTA DE CREDITO';
  return 'DOCUMENTO';
}
