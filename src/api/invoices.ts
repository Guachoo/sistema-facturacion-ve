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

      const response = await fetch(`${SUPABASE_URL}/rest/v1/invoices?order=fecha.desc`, {
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
        numero: row.numero,
        numeroControl: row.numero_control,
        fecha: row.fecha,
        emisor: {
          nombre: row.emisor_nombre,
          rif: row.emisor_rif,
          domicilio: row.emisor_domicilio,
        },
        receptor: {
          id: row.customer_id,
          rif: row.receptor_rif,
          razonSocial: row.receptor_razon_social,
          domicilio: row.receptor_domicilio,
          tipoContribuyente: row.receptor_tipo_contribuyente,
        },
        lineas: row.lineas,
        pagos: row.pagos,
        subtotal: parseFloat(row.subtotal),
        montoIva: parseFloat(row.monto_iva),
        montoIgtf: parseFloat(row.monto_igtf),
        total: parseFloat(row.total),
        totalUsdReferencia: parseFloat(row.total_usd_referencia),
        tasaBcv: parseFloat(row.tasa_bcv),
        fechaTasaBcv: row.fecha_tasa_bcv,
        canal: row.canal,
        estado: row.estado,
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
      const lastInvoiceResponse = await fetch(`${SUPABASE_URL}/rest/v1/invoices?select=numero&order=created_at.desc&limit=1`, {\n        method: 'GET',\n        headers: {\n          'Content-Type': 'application/json',\n          'apikey': SUPABASE_ANON_KEY,\n          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,\n        }\n      });\n\n      let lastNumber = 0;\n      if (lastInvoiceResponse.ok) {\n        const lastInvoiceData = await lastInvoiceResponse.json();\n        if (Array.isArray(lastInvoiceData) && lastInvoiceData.length > 0) {\n          const lastInvoice = lastInvoiceData[0];\n          lastNumber = lastInvoice ? parseInt(lastInvoice.numero.split('-')[1]) : 0;\n        }\n      }\n\n      const newNumber = `FAC-${String(lastNumber + 1).padStart(6, '0')}`;\n      const controlNumber = `DIG-${new Date().getFullYear()}${String(lastNumber + 1).padStart(6, '0')}`;\n\n      console.log('Generated invoice numbers:', { newNumber, controlNumber });\n\n      const insertData = {\n        numero: newNumber,\n        numero_control: controlNumber,\n        fecha: invoice.fecha,\n        emisor_nombre: invoice.emisor.nombre,\n        emisor_rif: invoice.emisor.rif,\n        emisor_domicilio: invoice.emisor.domicilio,\n        customer_id: invoice.receptor.id,\n        receptor_rif: invoice.receptor.rif,\n        receptor_razon_social: invoice.receptor.razonSocial,\n        receptor_domicilio: invoice.receptor.domicilio,\n        receptor_tipo_contribuyente: invoice.receptor.tipoContribuyente,\n        lineas: invoice.lineas,\n        pagos: invoice.pagos,\n        subtotal: invoice.subtotal,\n        monto_iva: invoice.montoIva,\n        monto_igtf: invoice.montoIgtf,\n        total: invoice.total,\n        total_usd_referencia: invoice.totalUsdReferencia,\n        tasa_bcv: invoice.tasaBcv,\n        fecha_tasa_bcv: invoice.fechaTasaBcv,\n        canal: invoice.canal,\n        estado: invoice.estado,\n        factura_afectada_id: invoice.facturaAfectadaId,\n        factura_afectada_numero: invoice.facturaAfectadaNumero,\n        tipo_nota: invoice.tipoNota,\n        motivo_nota: invoice.motivoNota,\n      };\n\n      const response = await fetch(`${SUPABASE_URL}/rest/v1/invoices`, {\n        method: 'POST',\n        headers: {\n          'Content-Type': 'application/json',\n          'apikey': SUPABASE_ANON_KEY,\n          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,\n          'Prefer': 'return=representation'\n        },\n        body: JSON.stringify(insertData)\n      });\n\n      console.log('Create invoice response status:', response.status);\n\n      if (!response.ok) {\n        const errorText = await response.text();\n        console.error('REST API error creating invoice:', errorText);\n        throw new Error(`Error ${response.status}: ${errorText}`);\n      }\n\n      const data = await response.json();\n      console.log('Invoice created via REST API:', data);\n\n      if (!data || !Array.isArray(data) || data.length === 0) {\n        throw new Error('No se recibieron datos del servidor');\n      }\n\n      const createdInvoice = data[0];\n\n      return {\n        id: createdInvoice.id,\n        numero: createdInvoice.numero,\n        numeroControl: createdInvoice.numero_control,\n        fecha: createdInvoice.fecha,\n        emisor: {\n          nombre: createdInvoice.emisor_nombre,\n          rif: createdInvoice.emisor_rif,\n          domicilio: createdInvoice.emisor_domicilio,\n        },\n        receptor: {\n          id: createdInvoice.customer_id,\n          rif: createdInvoice.receptor_rif,\n          razonSocial: createdInvoice.receptor_razon_social,\n          domicilio: createdInvoice.receptor_domicilio,\n          tipoContribuyente: createdInvoice.receptor_tipo_contribuyente,\n        },\n        lineas: createdInvoice.lineas,\n        pagos: createdInvoice.pagos,\n        subtotal: parseFloat(createdInvoice.subtotal),\n        montoIva: parseFloat(createdInvoice.monto_iva),\n        montoIgtf: parseFloat(createdInvoice.monto_igtf),\n        total: parseFloat(createdInvoice.total),\n        totalUsdReferencia: parseFloat(createdInvoice.total_usd_referencia),\n        tasaBcv: parseFloat(createdInvoice.tasa_bcv),\n        fechaTasaBcv: createdInvoice.fecha_tasa_bcv,\n        canal: createdInvoice.canal,\n        estado: createdInvoice.estado,\n        createdAt: createdInvoice.created_at,\n        updatedAt: createdInvoice.updated_at,\n      };\n    },\n    onSuccess: () => {\n      queryClient.invalidateQueries({ queryKey: ['invoices'] });\n    },\n  });\n};

export const useVoidInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }): Promise<void> => {
      console.log('Voiding invoice via REST API:', { id, reason });

      // Use direct REST API to avoid supabase-js headers issues
      const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

      const updateData = {
        estado: 'nota_credito',
        motivo_nota: reason
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/invoices?id=eq.${id}`, {
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