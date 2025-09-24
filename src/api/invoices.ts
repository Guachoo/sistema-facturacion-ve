import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Invoice } from '@/types';

export const useInvoices = () => {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async (): Promise<Invoice[]> => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) throw error;

      return (data || []).map(row => ({
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
      // Generate invoice number
      const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('numero')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const lastNumber = lastInvoice ? parseInt(lastInvoice.numero.split('-')[1]) : 0;
      const newNumber = `FAC-${String(lastNumber + 1).padStart(6, '0')}`;
      const controlNumber = `DIG-${new Date().getFullYear()}${String(lastNumber + 1).padStart(6, '0')}`;

      const { data, error } = await supabase
        .from('invoices')
        .insert([{
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
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        numero: data.numero,
        numeroControl: data.numero_control,
        fecha: data.fecha,
        emisor: {
          nombre: data.emisor_nombre,
          rif: data.emisor_rif,
          domicilio: data.emisor_domicilio,
        },
        receptor: {
          id: data.customer_id,
          rif: data.receptor_rif,
          razonSocial: data.receptor_razon_social,
          domicilio: data.receptor_domicilio,
          tipoContribuyente: data.receptor_tipo_contribuyente,
        },
        lineas: data.lineas,
        pagos: data.pagos,
        subtotal: parseFloat(data.subtotal),
        montoIva: parseFloat(data.monto_iva),
        montoIgtf: parseFloat(data.monto_igtf),
        total: parseFloat(data.total),
        totalUsdReferencia: parseFloat(data.total_usd_referencia),
        tasaBcv: parseFloat(data.tasa_bcv),
        fechaTasaBcv: data.fecha_tasa_bcv,
        canal: data.canal,
        estado: data.estado,
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
      const { error } = await supabase
        .from('invoices')
        .update({
          estado: 'nota_credito',
          motivo_nota: reason
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};