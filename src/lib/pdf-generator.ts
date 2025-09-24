import jsPDF from 'jspdf';
import { formatVES, formatUSD, formatDateVE, formatNumber } from './formatters';
import type { Invoice } from '@/types';

export const generateInvoicePDF = (invoice: Invoice): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPosition = 30;

  // Helper function to add text
  const addText = (text: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right', fontSize?: number, fontStyle?: string }) => {
    if (options?.fontSize) doc.setFontSize(options.fontSize);
    if (options?.fontStyle) doc.setFont('helvetica', options.fontStyle);
    doc.text(text, x, y, { align: options?.align || 'left' });
    doc.setFont('helvetica', 'normal'); // Reset font
    doc.setFontSize(12); // Reset font size
  };

  // Header
  addText('FACTURA', margin, yPosition, { fontSize: 24, fontStyle: 'bold' });
  addText('Documento generado por medios digitales', margin, yPosition + 8, { fontSize: 10 });
  
  addText(`N° ${invoice.numero}`, pageWidth - margin, yPosition, { align: 'right', fontSize: 16, fontStyle: 'bold' });
  addText(`Control: ${invoice.numeroControl}`, pageWidth - margin, yPosition + 8, { align: 'right', fontSize: 10 });
  addText(`Fecha: ${formatDateVE(invoice.fecha)}`, pageWidth - margin, yPosition + 16, { align: 'right', fontSize: 10 });

  yPosition += 40;

  // Emisor and Receptor
  addText('EMISOR', margin, yPosition, { fontStyle: 'bold' });
  addText('RECEPTOR', pageWidth / 2 + 10, yPosition, { fontStyle: 'bold' });
  
  yPosition += 10;
  
  // Emisor details
  addText(invoice.emisor.nombre, margin, yPosition, { fontStyle: 'bold' });
  addText(`RIF: ${invoice.emisor.rif}`, margin, yPosition + 8);
  addText(invoice.emisor.domicilio, margin, yPosition + 16);

  // Receptor details
  addText(invoice.receptor.razonSocial, pageWidth / 2 + 10, yPosition, { fontStyle: 'bold' });
  addText(`RIF: ${invoice.receptor.rif}`, pageWidth / 2 + 10, yPosition + 8);
  addText(invoice.receptor.domicilio, pageWidth / 2 + 10, yPosition + 16);

  const tipoContrib = invoice.receptor.tipoContribuyente === 'especial' ? 'Contribuyente Especial' :
                      invoice.receptor.tipoContribuyente === 'ordinario' ? 'Contribuyente Ordinario' :
                      'Contribuyente Formal';
  addText(tipoContrib, pageWidth / 2 + 10, yPosition + 24, { fontSize: 8 });

  yPosition += 50;

  // Items table header
  const tableStartY = yPosition;
  const colWidths = [25, 60, 20, 25, 15, 25, 20];
  const headers = ['Código', 'Descripción', 'Cant.', 'Precio Unit.', 'Desc.%', 'Base Imp.', 'IVA'];
  
  let xPos = margin;
  headers.forEach((header, index) => {
    addText(header, xPos, yPosition, { fontStyle: 'bold', fontSize: 10 });
    xPos += colWidths[index];
  });

  yPosition += 8;
  doc.line(margin, yPosition, pageWidth - margin, yPosition); // Header line
  yPosition += 5;

  // Items
  invoice.lineas.forEach((line) => {
    xPos = margin;
    const rowData = [
      line.codigo,
      line.descripcion.length > 25 ? line.descripcion.substring(0, 25) + '...' : line.descripcion,
      formatNumber(line.cantidad, 0),
      formatNumber(line.precioUnitario),
      formatNumber(line.descuento, 1) + '%',
      formatNumber(line.baseImponible),
      formatNumber(line.montoIva)
    ];

    rowData.forEach((data, index) => {
      addText(data, xPos, yPosition, { fontSize: 9 });
      xPos += colWidths[index];
    });
    yPosition += 12;
  });

  yPosition += 10;
  doc.line(margin, yPosition, pageWidth - margin, yPosition); // Items end line

  // Payment methods
  if (invoice.pagos.length > 0) {
    yPosition += 15;
    addText('FORMAS DE PAGO', margin, yPosition, { fontStyle: 'bold' });
    yPosition += 10;

    invoice.pagos.forEach((pago) => {
      let paymentType = '';
      switch (pago.tipo) {
        case 'transferencia_ves': paymentType = 'Transferencia VES'; break;
        case 'usd_cash': paymentType = 'USD Efectivo'; break;
        case 'zelle': paymentType = 'Zelle'; break;
        case 'mixto': paymentType = 'Mixto'; break;
      }
      
      addText(paymentType, margin, yPosition, { fontSize: 10 });
      addText(formatVES(pago.monto), pageWidth - margin - 40, yPosition, { fontSize: 10, align: 'right' });
      yPosition += 8;
    });
  }

  // Totals
  yPosition += 15;
  const totalsX = pageWidth - margin - 80;
  
  addText('Subtotal:', totalsX, yPosition);
  addText(formatVES(invoice.subtotal), pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 8;

  addText('IVA (16%):', totalsX, yPosition);
  addText(formatVES(invoice.montoIva), pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 8;

  if (invoice.montoIgtf > 0) {
    addText('IGTF (3%):', totalsX, yPosition);
    addText(formatVES(invoice.montoIgtf), pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 8;
  }

  doc.line(totalsX, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  addText('TOTAL VES:', totalsX, yPosition, { fontStyle: 'bold' });
  addText(formatVES(invoice.total), pageWidth - margin, yPosition, { align: 'right', fontStyle: 'bold' });
  yPosition += 12;

  // USD Reference
  addText(`Equivalencia al tipo de cambio BCV del día:`, margin, yPosition, { fontSize: 9 });
  yPosition += 6;
  addText(`1 USD = ${formatNumber(invoice.tasaBcv)} VES (${invoice.fechaTasaBcv})`, margin, yPosition, { fontSize: 9 });
  yPosition += 6;
  addText(`Total referencial en USD: ${formatUSD(invoice.totalUsdReferencia)}`, margin, yPosition, { fontSize: 9, fontStyle: 'bold' });

  // Footer
  yPosition += 20;
  addText('Documento generado por medios digitales. La equivalencia en divisas es referencial.', margin, yPosition, { fontSize: 8 });
  addText('Total exigible en VES.', margin, yPosition + 6, { fontSize: 8 });

  // Canal badge
  addText(`Canal: ${invoice.canal === 'digital' ? 'Digital' : 'Máquina Fiscal'}`, margin, yPosition + 12, { fontSize: 8 });

  // Anulada stamp if applicable
  if (invoice.estado === 'anulada') {
    doc.setTextColor(255, 0, 0);
    addText('FACTURA ANULADA', pageWidth / 2, pageWidth / 2, { align: 'center', fontSize: 24, fontStyle: 'bold' });
    doc.setTextColor(0, 0, 0);
  }

  // Save the PDF
  doc.save(`factura-${invoice.numero}.pdf`);
};