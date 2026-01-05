import type { FacturaDB, FacturaItemDB } from '@/api/facturas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Tipos para el formato JSON estándar de documentos electrónicos TFHKA
// Todos los documentos usan PascalCase
export interface DocumentoElectronico {
  DocumentoElectronico: any;
}

// Función auxiliar para convertir números a letras
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

// Función para obtener descripción del tipo de pago
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

// Función para convertir una factura de la BD al formato JSON estándar TFHKA
// Todos los documentos (01, 02, 03) usan PascalCase
export function convertirFacturaAJSON(
  factura: FacturaDB,
  items: FacturaItemDB[]
): DocumentoElectronico {
  const esNota = factura.tipo_documento === '02' || factura.tipo_documento === '03';
  // Extraer tipo de identificación y número del RIF
  const rifParts = `${factura.cliente_tipo_id}-${factura.cliente_numero_id}`.split('-');
  const tipoId = rifParts[0] || 'V';
  const numeroId = rifParts.slice(1).join('');

  // Formatear fechas
  const fechaEmision = format(new Date(factura.fecha_emision), 'dd/MM/yyyy', { locale: es });
  const horaEmision = factura.hora_emision || format(new Date(), 'hh:mm:ss a', { locale: es });

  // Calcular totales
  const baseImponible = factura.subtotal || 0;
  const totalIVA = factura.total_iva || 0;
  const totalAPagar = factura.total_a_pagar || 0;
  const montoExento = factura.monto_exento_total || 0;

  // Calcular impuestos por tipo (según los items)
  const impuestosPorTipo: Record<string, { base: number; valor: number; tasa: number }> = {};

  items.forEach(item => {
    const codigoImp = item.codigo_impuesto || 'G';
    if (!impuestosPorTipo[codigoImp]) {
      impuestosPorTipo[codigoImp] = { base: 0, valor: 0, tasa: item.tasa_iva || 0 };
    }
    impuestosPorTipo[codigoImp].base += item.precio_item;
    impuestosPorTipo[codigoImp].valor += item.valor_iva;
  });

  // Generar impuestosSubtotal con todos los tipos de impuestos venezolanos
  const impuestosSubtotal = [
    {
      CodigoTotalImp: 'G',
      AlicuotaImp: '16.00',
      BaseImponibleImp: (impuestosPorTipo['G']?.base || 0).toFixed(2),
      ValorTotalImp: (impuestosPorTipo['G']?.valor || 0).toFixed(2),
    },
    {
      CodigoTotalImp: 'R',
      AlicuotaImp: '8.00',
      BaseImponibleImp: (impuestosPorTipo['R']?.base || 0).toFixed(2),
      ValorTotalImp: (impuestosPorTipo['R']?.valor || 0).toFixed(2),
    },
    {
      CodigoTotalImp: 'E',
      AlicuotaImp: '0.00',
      BaseImponibleImp: (impuestosPorTipo['E']?.base || 0).toFixed(2),
      ValorTotalImp: '0.00',
    },
    {
      CodigoTotalImp: 'P',
      AlicuotaImp: '0.00',
      BaseImponibleImp: (impuestosPorTipo['P']?.base || 0).toFixed(2),
      ValorTotalImp: '0.00',
    },
    {
      CodigoTotalImp: 'A',
      AlicuotaImp: '31.00',
      BaseImponibleImp: (impuestosPorTipo['A']?.base || 0).toFixed(2),
      ValorTotalImp: (impuestosPorTipo['A']?.valor || 0).toFixed(2),
    },
  ];

  // Agregar IGTF si aplica
  if (factura.monto_igtf && factura.monto_igtf > 0) {
    impuestosSubtotal.push({
      CodigoTotalImp: 'IGTF',
      AlicuotaImp: '3.00',
      BaseImponibleImp: ((factura.monto_igtf / 0.03) || 0).toFixed(2),
      ValorTotalImp: factura.monto_igtf.toFixed(2),
    });
  }

  // Mapear tipo de pago a código
  const mapearFormaPago = (tipoPago: string): string => {
    const mapeo: Record<string, string> = {
      'efectivo': '01',
      'transferencia_ves': '03',
      'tarjeta_debito': '05',
      'tarjeta_credito': '04',
      'cheque': '02',
      'efectivo_divisa': '09',
      'efectivo_moneda_legal': '08',
    };
    return mapeo[tipoPago] || '01';
  };

  // Usar PascalCase para todos los documentos (compatible con TFHKA)
  return {
    DocumentoElectronico: {
      Encabezado: {
        IdentificacionDocumento: {
          TipoDocumento: factura.tipo_documento,
          NumeroDocumento: factura.numero_documento,
          TipoProveedor: '',
          TipoTransaccion: factura.tipo_documento === '02' ? '03' : '',
          NumeroPlanillaImportacion: null,
          NumeroExpedienteImportacion: null,
          SerieFacturaAfectada: esNota ? (factura.serie_factura_afectada || '') : null,
          NumeroFacturaAfectada: esNota ? (factura.numero_factura_afectada || '') : null,
          FechaFacturaAfectada: esNota && factura.fecha_factura_afectada
            ? format(new Date(factura.fecha_factura_afectada), 'dd/MM/yyyy', { locale: es })
            : null,
          MontoFacturaAfectada: esNota ? (factura.monto_factura_afectada?.toFixed(2) || '0.00') : null,
          ComentarioFacturaAfectada: esNota ? (factura.comentario_factura_afectada || '') : null,
          RegimenEspTributacion: null,
          FechaEmision: fechaEmision,
          FechaVencimiento: null,
          HoraEmision: horaEmision,
          Anulado: factura.anulado || false,
          TipoDePago: factura.tipo_de_pago || 'Inmediato',
          Serie: factura.serie || '',
          Sucursal: factura.sucursal || '0001',
          TipoDeVenta: factura.tipo_de_venta || 'interna',
          Moneda: factura.moneda,
          TransaccionId: factura.transaccion_id || null,
          UrlPdf: factura.url_pdf || null,
        },
          Vendedor: null,
          Comprador: {
            TipoIdentificacion: tipoId,
            NumeroIdentificacion: numeroId,
            RazonSocial: factura.cliente_razon_social,
            Direccion: factura.cliente_direccion || '',
            Pais: 'VE',
            Telefono: factura.cliente_telefono ? [factura.cliente_telefono] : [],
            Correo: factura.cliente_correo ? [factura.cliente_correo] : [],
          },
          SujetoRetenido: null,
          Totales: {
            NroItems: items.length.toString(),
            MontoGravadoTotal: baseImponible.toFixed(2),
            MontoExentoTotal: montoExento > 0 ? montoExento.toFixed(2) : null,
            Subtotal: factura.subtotal.toFixed(2),
            TotalAPagar: totalAPagar.toFixed(2),
            TotalIVA: totalIVA.toFixed(2),
            MontoTotalConIVA: (factura.monto_total_con_iva || (baseImponible + totalIVA)).toFixed(2),
            MontoEnLetras: factura.monto_en_letras || numeroALetras(totalAPagar).toUpperCase(),
            TotalDescuento: (factura.total_descuento || 0).toFixed(2),
            ListaDescBonificacion: null,
            ImpuestosSubtotal: impuestosSubtotal,
            FormasPago: [
              {
                Descripcion: obtenerDescripcionTipoPago(factura.tipo_de_pago || 'efectivo'),
                Fecha: fechaEmision,
                Forma: mapearFormaPago(factura.tipo_de_pago || 'efectivo'),
                Monto: totalAPagar.toFixed(2),
                Moneda: factura.moneda,
                TipoCambio: factura.tipo_cambio ? factura.tipo_cambio.toFixed(2) : null,
              },
            ],
            TotalesRetencion: null,
          },
        },
        DetallesItems: items.map((item, index) => ({
          NumeroLinea: (index + 1).toString(),
          CodigoCIIU: item.codigo_ciiu || null,
          CodigoPLU: item.codigo_plu,
          IndicadorBienoServicio: item.indicador_bien_servicio,
          Descripcion: item.descripcion,
          Cantidad: item.cantidad.toString(),
          UnidadMedida: item.unidad_medida || 'NIU',
          PrecioUnitario: item.precio_unitario.toFixed(2),
          PrecioUnitarioDescuento: item.precio_unitario_descuento?.toFixed(2) || null,
          MontoBonificacion: item.monto_bonificacion?.toFixed(2) || null,
          DescripcionBonificacion: item.descrip_bonificacion || null,
          DescuentoMonto: item.descuento_monto?.toFixed(2) || null,
          PrecioItem: item.precio_item.toFixed(2),
          CodigoImpuesto: item.codigo_impuesto || 'G',
          TasaIVA: item.tasa_iva.toFixed(2),
          ValorIVA: item.valor_iva.toFixed(2),
          ValorTotalItem: item.valor_total_item.toFixed(2),
          InfoAdicionalItem: item.info_adicional_item || null,
          ListaItemOTI: null,
        })),
        DetallesRetencion: null,
        Viajes: null,
        InfoAdicional: [
          {
            Campo: 'Informativo',
            Valor: 'Documento generado electrónicamente por el sistema Axiona Facturación.',
          },
        ],
        GuiaDespacho: null,
      },
    };
  }

// Función para descargar el JSON
export function descargarFacturaJSON(factura: FacturaDB, items: FacturaItemDB[]): void {
  const documentoJSON = convertirFacturaAJSON(factura, items);
  const jsonString = JSON.stringify(documentoJSON, null, 4);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Factura_${factura.serie}_${factura.numero_documento}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
