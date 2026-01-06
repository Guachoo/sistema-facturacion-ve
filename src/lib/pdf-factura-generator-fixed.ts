import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { FacturaDB } from '@/api/facturas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { renderHeaderFixed } from './pdf-header-renderer';
import { GRU_LOGO_BASE64 } from './logo-base64';
import { PDF_LAYOUT, PDF_COLORS, PDF_FONTS, formatBS, formatUSD } from './pdf-layout-constants';
import { COMPANY_CONFIG } from '@/config/company';

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

  // Renderizar encabezado con sistema de cajas fijas
  renderHeaderFixed(doc, factura, debugMode);

  // Renderizar tabla de items
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
// TABLA DE ITEMS
// ============================================

function renderItemsTable(doc: jsPDF, items: any[], pageWidth: number) {
  const { TABLE } = PDF_LAYOUT;

  console.log('📋 DEBUG renderItemsTable - Items recibidos:', items);
  console.log('📋 DEBUG renderItemsTable - Cantidad:', items?.length);

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
    // Usar las columnas corregidas desde las constantes
    columnStyles: {
      0: { cellWidth: TABLE.COLUMNS.CODIGO.width, halign: 'center' },
      1: { cellWidth: TABLE.COLUMNS.DESCRIPCION.width },
      2: { cellWidth: TABLE.COLUMNS.CANT.width, halign: 'center' },
      3: { cellWidth: TABLE.COLUMNS.PRECIO_UNIT.width, halign: 'right' },
      4: { cellWidth: TABLE.COLUMNS.ALICUOTA.width, halign: 'center' },
      5: { cellWidth: TABLE.COLUMNS.TOTAL.width, halign: 'right' },
    },
    margin: { left: TABLE.X, right: PDF_LAYOUT.MARGIN_RIGHT },
    tableWidth: TABLE.WIDTH,
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

  yPos += 12; // Aumentado de 8 a 12 para más espacio

  // Los items vienen en BS, primero calcular totales en BS
  const subtotalBS = items.reduce((sum, item) => sum + (item.valor_total_item || 0), 0);
  const descuentoBS = 0;
  const exentoBS = 0;
  const baseImponibleBS = subtotalBS - descuentoBS - exentoBS;
  const ivaBS = baseImponibleBS * 0.16;
  const igtfBS = 0;
  const totalBS = baseImponibleBS + ivaBS + igtfBS;

  // Conversión a USD dividiendo por la tasa BCV
  const subtotalUSD = subtotalBS / tasaBCV;
  const descuentoUSD = descuentoBS / tasaBCV;
  const exentoUSD = exentoBS / tasaBCV;
  const baseImponibleUSD = baseImponibleBS / tasaBCV;
  const ivaUSD = ivaBS / tasaBCV;
  const igtfUSD = igtfBS / tasaBCV;
  const totalUSD = totalBS / tasaBCV;

  const { TOTALS } = PDF_LAYOUT;

  // Etiquetas y valores
  const labels = [
    'Subtotal',
    'Descuento',
    'Exento',
    'Base Imponible (G)',
    'Alícuota I.V.A. (16.00%)',
    'Base Imponible (IGTF)',
    'Alícuota IGTF (3.00%)',
  ];

  const valuesUSD = [subtotalUSD, descuentoUSD, exentoUSD, baseImponibleUSD, ivaUSD, 0, igtfUSD];
  const valuesBS = [subtotalBS, descuentoBS, exentoBS, baseImponibleBS, ivaBS, 0, igtfBS];

  doc.setFontSize(TOTALS.FONT_SIZE);
  doc.setFont('helvetica', 'normal');

  // Posiciones según formato exacto de referencia
  const leftLabelX = 38;
  const leftCurrencyX = 80;
  const leftValueX = 105;

  const rightLabelX = pageWidth / 2 + 15;
  const rightCurrencyX = pageWidth / 2 + 57;
  const rightValueX = pageWidth / 2 + 88;

  // COLUMNA USD (izquierda)
  labels.forEach((label, i) => {
    const y = yPos + i * TOTALS.LINE_HEIGHT;
    doc.setTextColor(...PDF_COLORS.BLACK);
    // Label alineado a la izquierda
    doc.text(label, leftLabelX, y);
    // Moneda en posición fija
    doc.text('USD.', leftCurrencyX, y);
    // Valor alineado a la derecha
    doc.text(formatUSD(valuesUSD[i]), leftValueX, y, { align: 'right' });
  });

  // COLUMNA BS (derecha)
  labels.forEach((label, i) => {
    const y = yPos + i * TOTALS.LINE_HEIGHT;
    doc.setTextColor(...PDF_COLORS.BLACK);
    // Label alineado a la izquierda
    doc.text(label, rightLabelX, y);
    // Moneda en posición fija
    doc.text('BS.', rightCurrencyX, y);
    // Valor alineado a la derecha (usando valores precalculados en BS)
    doc.text(formatBS(valuesBS[i]), rightValueX, y, { align: 'right' });
  });

  yPos += labels.length * TOTALS.LINE_HEIGHT + 4;

  // Fila "Total a Pagar" con fondo azul (dos bloques separados)
  const totalHeight = 7;
  const leftBoxWidth = 78;
  const rightBoxWidth = 85;

  // Fondo azul para USD (desplazado a la derecha)
  doc.setFillColor(...TOTALS.TOTAL_PAGAR_BG);
  doc.rect(leftLabelX - 8, yPos - 4.5, leftBoxWidth, totalHeight, 'F');

  // Fondo azul para BS (desplazado a la derecha)
  doc.rect(rightLabelX - 8, yPos - 4.5, rightBoxWidth, totalHeight, 'F');

  // Texto Total a Pagar USD
  doc.setTextColor(...TOTALS.TOTAL_PAGAR_TEXT);
  doc.setFont('helvetica', 'bold');
  doc.text('Total a Pagar', leftLabelX, yPos);
  doc.text('USD.', leftCurrencyX, yPos);
  doc.text(formatUSD(totalUSD), leftValueX, yPos, { align: 'right' });

  // Texto Total a Pagar BS
  doc.text('Total a Pagar', rightLabelX, yPos);
  doc.text('BS.', rightCurrencyX, yPos);
  doc.text(formatBS(totalBS), rightValueX, yPos, { align: 'right' });

  return yPos + 10;
}

// ============================================
// PIE DE PÁGINA
// ============================================

function renderFooter(doc: jsPDF, pageWidth: number, pageHeight: number, startY: number) {
  // Calcular posición para el footer al final de la página
  const footerHeight = 35; // Altura aproximada del footer
  let yPos = pageHeight - footerHeight;

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PDF_COLORS.BLACK);

  const legalText1 =
    'Este pago estará sujeto al cobro adicional del 3% del Impuesto a las Grandes Transacciones Financieras (IGTF), de conformidad con la Providencia Administrativa SNAT/2022/000013 publicada en la G.O.N 42.339 del 17-03-2022, en caso de ser cancelado en divisas. No aplica en pago en Bs.';

  const legalText2 =
    'Este documento no se constituye en medio de pago frente a terceros, (Retención General), (Retención de ISLR) establecido en la G.O.N. N° 6.152 de fecha 18/11/2014 o la aplicación, según lo establecido en el artículo 13 numeral 14 de la Providencia Administrativa SNAT /2011/0071 ( ) en concordancia con el artículo 128 de la Ley del Banco Central de Venezuela (BCV), artículo 25 de la Ley que establece el Impuesto al Valor Agregado (IVA) y 36 del Reglamento de Ley de Impuesto al Valor Agregado (RLIVA).';

  const lines1 = doc.splitTextToSize(legalText1, pageWidth - 20);
  const lines2 = doc.splitTextToSize(legalText2, pageWidth - 20);

  // Texto justificado
  lines1.forEach((line: string) => {
    doc.text(line, 10, yPos, { align: 'justify', maxWidth: pageWidth - 20 });
    yPos += 3;
  });

  yPos += 2;

  lines2.forEach((line: string) => {
    doc.text(line, 10, yPos, { align: 'justify', maxWidth: pageWidth - 20 });
    yPos += 3;
  });

  yPos += 5;

  // FRANJA AZUL SEPARADORA
  doc.setFillColor(...PDF_COLORS.PRIMARY_BLUE);
  doc.rect(10, yPos - 1, pageWidth - 20, 1.5, 'F'); // Franja azul delgada de 1.5mm de alto

  yPos += 4;

  // Bloque final
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
