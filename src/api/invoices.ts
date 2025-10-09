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
      const lastInvoiceResponse = await fetch(`${SUPABASE_URL}/rest/v1/invoices?select=numero&order=created_at.desc&limit=1`, {
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
          lastNumber = lastInvoice ? parseInt(lastInvoice.numero.split('-')[1]) : 0;
        }
      }

      const newNumber = `FAC-${String(lastNumber + 1).padStart(6, '0')}`;
      const controlNumber = `DIG-${new Date().getFullYear()}${String(lastNumber + 1).padStart(6, '0')}`;

      console.log('Generated invoice numbers:', { newNumber, controlNumber });

      const insertData = {
        numero: newNumber,
        numero_control: controlNumber,
        fecha: invoice.fecha,
        emisor_nombre: invoice.emisor.nombre,
        emisor_rif: invoice.emisor.rif,
        emisor_domicilio: invoice.emisor.domicilio,
        customer_id: invoice.receptor.id,
        receptor_rif: invoice.receptor.rif,
        receptor_razon_social: invoice.receptor.razonSocial,
        receptor_domicilio: invoice.receptor.domicilio,
        receptor_tipo_contribuyente: invoice.receptor.tipoContribuyente,
        lineas: invoice.lineas,
        pagos: invoice.pagos,
        subtotal: invoice.subtotal,
        monto_iva: invoice.montoIva,
        monto_igtf: invoice.montoIgtf,
        total: invoice.total,
        total_usd_referencia: invoice.totalUsdReferencia,
        tasa_bcv: invoice.tasaBcv,
        fecha_tasa_bcv: invoice.fechaTasaBcv,
        canal: invoice.canal,
        estado: invoice.estado,
        factura_afectada_id: invoice.facturaAfectadaId,
        factura_afectada_numero: invoice.facturaAfectadaNumero,
        tipo_nota: invoice.tipoNota,
        motivo_nota: invoice.motivoNota,
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/invoices`, {
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

      return {
        id: createdInvoice.id,
        numero: createdInvoice.numero,
        numeroControl: createdInvoice.numero_control,
        fecha: createdInvoice.fecha,
        emisor: {
          nombre: createdInvoice.emisor_nombre,
          rif: createdInvoice.emisor_rif,
          domicilio: createdInvoice.emisor_domicilio,
        },
        receptor: {
          id: createdInvoice.customer_id,
          rif: createdInvoice.receptor_rif,
          razonSocial: createdInvoice.receptor_razon_social,
          domicilio: createdInvoice.receptor_domicilio,
          tipoContribuyente: createdInvoice.receptor_tipo_contribuyente,
        },
        lineas: createdInvoice.lineas,
        pagos: createdInvoice.pagos,
        subtotal: parseFloat(createdInvoice.subtotal),
        montoIva: parseFloat(createdInvoice.monto_iva),
        montoIgtf: parseFloat(createdInvoice.monto_igtf),
        total: parseFloat(createdInvoice.total),
        totalUsdReferencia: parseFloat(createdInvoice.total_usd_referencia),
        tasaBcv: parseFloat(createdInvoice.tasa_bcv),
        fechaTasaBcv: createdInvoice.fecha_tasa_bcv,
        canal: createdInvoice.canal,
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