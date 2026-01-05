import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Invoice } from '@/types';

export const useInvoices = () => {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async (): Promise<Invoice[]> => {
      console.log('Fetching invoices via REST API');

      // Use direct REST API to avoid supabase-js headers issues
      const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

      const response = await fetch(`${SUPABASE_URL}/rest/v1/facturas_electronicas?order=fecha_emision.desc`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      });

      console.log('Invoices fetch response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error fetching invoices:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Invoices fetched via REST API:', data?.length || 0, 'records');

      if (!Array.isArray(data)) {
        console.error('Invalid invoices response format:', data);
        return [];
      }

      return data.map(row => ({
        id: row.id,
        numero: row.numero_documento || row.numero,
        numeroControl: row.numero_control,
        fecha: row.fecha_emision || row.fecha,
        emisor: {
          nombre: row.emisor_nombre || 'Axiona, C.A.',
          rif: row.emisor_rif || 'J-12345678-9',
          domicilio: row.emisor_domicilio || 'Caracas, Venezuela',
        },
        receptor: {
          id: row.customer_id || row.cliente_id,
          rif: row.receptor_rif || `${row.cliente_tipo_id}-${row.cliente_numero_id}`,
          razonSocial: row.receptor_razon_social || row.cliente_razon_social,
          domicilio: row.receptor_domicilio || row.cliente_direccion,
          tipoContribuyente: row.receptor_tipo_contribuyente || 'ordinario',
        },
        lineas: row.lineas || [],
        pagos: row.pagos || [],
        subtotal: parseFloat(row.subtotal) || 0,
        montoIva: parseFloat(row.monto_iva || row.total_iva) || 0,
        montoIgtf: parseFloat(row.monto_igtf) || 0,
        total: parseFloat(row.total || row.total_a_pagar) || 0,
        totalUsdReferencia: parseFloat(row.total_usd_referencia || row.total_a_pagar_usd) || 0,
        tasaBcv: parseFloat(row.tasa_bcv || row.tipo_cambio) || 0,
        fechaTasaBcv: row.fecha_tasa_bcv,
        canal: row.canal || 'digital',
        estado: row.estado || 'emitida',
        facturaAfectadaId: row.factura_afectada_id,
        facturaAfectadaNumero: row.factura_afectada_numero,
        tipoNota: row.tipo_nota,
        motivoNota: row.motivo_nota,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: Omit<Invoice, 'id' | 'numero' | 'numeroControl'>): Promise<Invoice> => {
      console.log('Creating invoice via REST API:', invoice);

      // Use direct REST API to avoid supabase-js headers issues
      const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

      // Generate invoice number - get last invoice number
      const lastInvoiceResponse = await fetch(`${SUPABASE_URL}/rest/v1/facturas_electronicas?select=numero_documento&order=created_at.desc&limit=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      });

      let lastNumber = 0;
      if (lastInvoiceResponse.ok) {
        const lastInvoiceData = await lastInvoiceResponse.json();
        if (Array.isArray(lastInvoiceData) && lastInvoiceData.length > 0) {
          const lastInvoice = lastInvoiceData[0];
          if (lastInvoice && lastInvoice.numero_documento) {
            const parts = lastInvoice.numero_documento.split('-');
            lastNumber = parts.length > 0 ? parseInt(parts[parts.length - 1]) : 0;
          }
        }
      }

      const newNumber = String(lastNumber + 1).padStart(8, '0');
      const serie = '001';
      const controlNumber = `CTRL-${new Date().getFullYear()}-${String(lastNumber + 1).padStart(6, '0')}`;

      console.log('Generated invoice numbers:', { newNumber, controlNumber });

      // Extraer RIF del receptor
      const rifParts = invoice.receptor.rif.split('-');
      const tipoId = rifParts[0] || 'J';
      const numeroId = rifParts.slice(1).join('-');

      const insertData = {
        tipo_documento: '01', // Factura
        numero_documento: newNumber,
        serie: serie,
        sucursal: '001',
        fecha_emision: invoice.fecha,
        hora_emision: new Date().toTimeString().split(' ')[0],
        cliente_id: invoice.receptor.id,
        cliente_tipo_id: tipoId,
        cliente_numero_id: numeroId,
        cliente_razon_social: invoice.receptor.razonSocial,
        cliente_direccion: invoice.receptor.domicilio,
        tipo_de_pago: invoice.pagos && invoice.pagos.length > 0 ? invoice.pagos[0].tipo : 'efectivo',
        tipo_de_venta: 'contado',
        moneda: 'VES',
        nro_items: invoice.lineas ? invoice.lineas.length : 0,
        monto_gravado_total: invoice.subtotal,
        monto_exento_total: 0,
        subtotal: invoice.subtotal,
        total_descuento: 0,
        subtotal_antes_descuento: invoice.subtotal,
        total_iva: invoice.montoIva,
        monto_total_con_iva: invoice.subtotal + invoice.montoIva,
        total_a_pagar: invoice.total,
        moneda_secundaria: 'USD',
        tipo_cambio: invoice.tasaBcv,
        total_a_pagar_usd: invoice.totalUsdReferencia,
        monto_igtf: invoice.montoIgtf,
        estado: invoice.estado,
        anulado: false,
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/facturas_electronicas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(insertData)
      });

      console.log('Create invoice response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error creating invoice:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Invoice created via REST API:', data);

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No se recibieron datos del servidor');
      }

      const createdInvoice = data[0];

      // ===================================
      // INSERTAR ITEMS DE LA FACTURA
      // ===================================
      if (invoice.lineas && invoice.lineas.length > 0) {
        console.log('Insertando items de la factura:', invoice.lineas);

        const itemsData = invoice.lineas.map((linea, index) => {
          // Calcular valores desde la estructura InvoiceLine
          const descuentoMonto = (linea.precioUnitario * linea.cantidad * linea.descuento) / 100;
          const precioItem = (linea.precioUnitario * linea.cantidad) - descuentoMonto;
          const valorIva = linea.montoIva || ((precioItem * linea.porcentajeIva) / 100);
          const valorTotal = precioItem + valorIva;

          return {
            factura_id: createdInvoice.id,
            numero_linea: index + 1,
            codigo_plu: linea.codigo || `ITEM-${index + 1}`,
            indicador_bien_servicio: 'S', // S = Servicio, B = Bien
            descripcion: linea.descripcion,
            cantidad: linea.cantidad,
            unidad_medida: 'UND',
            precio_unitario: linea.precioUnitario,
            descuento_monto: descuentoMonto,
            monto_bonificacion: 0,
            recargo_monto: 0,
            precio_item: precioItem,
            codigo_impuesto: linea.porcentajeIva > 0 ? 'G' : 'E', // G = Gravado, E = Exento
            tasa_iva: linea.porcentajeIva,
            valor_iva: valorIva,
            valor_total_item: valorTotal,
          };
        });

        const itemsResponse = await fetch(`${SUPABASE_URL}/rest/v1/facturas_items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(itemsData)
        });

        if (!itemsResponse.ok) {
          const errorText = await itemsResponse.text();
          console.error('Error insertando items:', errorText);
          // No fallar la creación de la factura si los items fallan
          console.warn('La factura se creó pero los items no se insertaron correctamente');
        } else {
          const insertedItems = await itemsResponse.json();
          console.log('Items insertados exitosamente:', insertedItems);
        }
      }

      return {
        id: createdInvoice.id,
        numero: createdInvoice.numero_documento,
        numeroControl: controlNumber,
        fecha: createdInvoice.fecha_emision,
        emisor: {
          nombre: invoice.emisor.nombre,
          rif: invoice.emisor.rif,
          domicilio: invoice.emisor.domicilio,
        },
        receptor: {
          id: createdInvoice.cliente_id,
          rif: `${createdInvoice.cliente_tipo_id}-${createdInvoice.cliente_numero_id}`,
          razonSocial: createdInvoice.cliente_razon_social,
          domicilio: createdInvoice.cliente_direccion,
          tipoContribuyente: invoice.receptor.tipoContribuyente,
        },
        lineas: invoice.lineas,
        pagos: invoice.pagos,
        subtotal: parseFloat(createdInvoice.subtotal),
        montoIva: parseFloat(createdInvoice.total_iva),
        montoIgtf: parseFloat(createdInvoice.monto_igtf) || 0,
        total: parseFloat(createdInvoice.total_a_pagar),
        totalUsdReferencia: parseFloat(createdInvoice.total_a_pagar_usd) || 0,
        tasaBcv: parseFloat(createdInvoice.tipo_cambio) || 0,
        fechaTasaBcv: invoice.fechaTasaBcv,
        canal: invoice.canal,
        estado: createdInvoice.estado,
        createdAt: createdInvoice.created_at,
        updatedAt: createdInvoice.updated_at,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

export const useVoidInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }): Promise<void> => {
      console.log('Voiding invoice via REST API:', { id, reason });

      // Use direct REST API to avoid supabase-js headers issues
      const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

      const updateData = {
        estado: 'anulada',
        anulado: true,
        motivo_anulacion: reason
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/facturas_electronicas?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(updateData)
      });

      console.log('Void invoice response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error voiding invoice:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      console.log('Invoice voided successfully via REST API');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};