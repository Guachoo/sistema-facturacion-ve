import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Invoice } from '@/types';
import { generateDocumentTransactionId } from '../lib/transaction-id-generator';
import { getMockInvoices, useMockInvoices, addMockInvoice, resetMockInvoicesCache } from '@/lib/mock-invoices';
import {
  validateInvoiceBeforeSave,
  generateNextInvoiceNumber,
  generateNextControlNumber
} from '../lib/invoice-validation';

// Función para refrescar datos mock
export const refreshMockInvoices = () => {
  if (useMockInvoices()) {
    resetMockInvoicesCache();
    console.log('🔧 Mock: Cache reseteado, próxima consulta obtendrá datos actualizados');
    return true;
  }
  return false;
};

export const useInvoices = () => {
  return useQuery({
    queryKey: ['invoices'],
    staleTime: 0, // Forzar recarga
    cacheTime: 0, // No cachear en modo desarrollo
    queryFn: async (): Promise<Invoice[]> => {
      // Verificar si usamos modo mock (sin Supabase)
      if (useMockInvoices()) {
        console.log('🔧 Usando facturas mock (sin Supabase)');
        const mockData = getMockInvoices();
        console.log('🔧 Mock: Datos que se van a retornar:', {
          totalFacturas: mockData.length,
          numerosFacturas: mockData.map(inv => inv.numero)
        });
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 500));
        return mockData;
      }

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
        throw new Error('Invalid response format from server');
      }

      return data.map(row => ({
        id: row.id,
        numero: row.numero,
        transaction_id: row.transaction_id, // ✅ NUEVO - ID transaccional
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
        baseImponible: parseFloat(row.base_imponible || row.subtotal), // Use subtotal as fallback
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
      // Verificar si usamos modo mock (sin Supabase)
      if (useMockInvoices()) {
        console.log('🔧 Creando factura mock (sin Supabase)');

        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 800));

        // Obtener facturas existentes para validación
        const currentInvoices = queryClient.getQueryData<Invoice[]>(['invoices']) || getMockInvoices();

        // Generar números únicos usando el sistema de validación
        const newNumber = generateNextInvoiceNumber(currentInvoices);
        const controlNumber = generateNextControlNumber(currentInvoices);

        // Validar antes de crear
        const validation = await validateInvoiceBeforeSave(
          {
            numero: newNumber,
            numeroControl: controlNumber,
            fecha: invoice.fecha || new Date().toISOString().split('T')[0]
          },
          currentInvoices
        );

        if (!validation.isValid) {
          throw new Error(`Error de validación: ${validation.errors.join(', ')}`);
        }

        // Mostrar warnings si existen
        if (validation.warnings.length > 0) {
          console.warn('⚠️ Advertencias de numeración:', validation.warnings);
        }

        // Generar ID de transacción
        const transactionId = generateDocumentTransactionId({
          serie: 'FAC',
          numeroDocumento: newNumber,
          tipoDocumento: invoice.estado === 'nota_credito' ? '02' : invoice.estado === 'nota_debito' ? '03' : '01'
        });

        // Obtener el siguiente ID único
        const maxId = currentInvoices.length > 0
          ? Math.max(...currentInvoices.map(inv => parseInt(inv.id) || 0))
          : 0;

        // Crear nueva factura mock
        const newInvoice: Invoice = {
          ...invoice,
          id: String(maxId + 1),
          numero: newNumber,
          numeroControl: controlNumber,
          transaction_id: transactionId,
          fecha: invoice.fecha || new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Simular éxito en TFHKA
        console.log('🔧 Simulando éxito en TFHKA:', {
          success: true,
          tfhkaId: `TFHKA_${Date.now()}`,
          qrCode: `QR_${controlNumber}`
        });

        // Agregar al cache dinámico y actualizar query cache
        addMockInvoice(newInvoice);
        const updatedInvoices = getMockInvoices();

        console.log('🔧 Mock: Nueva factura agregada al cache dinámico:', {
          nuevaFactura: newInvoice.numero,
          numeroControl: newInvoice.numeroControl,
          transactionId: newInvoice.transaction_id,
          totalFacturas: updatedInvoices.length
        });

        // Actualizar el cache de react-query
        queryClient.setQueryData(['invoices'], updatedInvoices);

        // Invalidar para forzar re-render
        queryClient.invalidateQueries({ queryKey: ['invoices'] });

        return newInvoice;
      }

      console.log('Creating invoice via REST API:', invoice);

      // Use direct REST API to avoid supabase-js headers issues
      const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

      // Obtener todas las facturas existentes para validación
      const existingInvoicesResponse = await fetch(`${SUPABASE_URL}/rest/v1/invoices?select=id,numero,numero_control,fecha`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      });

      let existingInvoices: Array<{id: string, numero: string, numeroControl: string, fecha: string}> = [];
      if (existingInvoicesResponse.ok) {
        const data = await existingInvoicesResponse.json();
        existingInvoices = Array.isArray(data) ? data.map(inv => ({
          id: inv.id,
          numero: inv.numero,
          numeroControl: inv.numero_control,
          fecha: inv.fecha
        })) : [];
      }

      // Generar números únicos usando el sistema de validación
      const newNumber = generateNextInvoiceNumber(existingInvoices);
      const controlNumber = generateNextControlNumber(existingInvoices);

      // Validar antes de crear
      const validation = await validateInvoiceBeforeSave(
        {
          numero: newNumber,
          numeroControl: controlNumber,
          fecha: invoice.fecha || new Date().toISOString().split('T')[0]
        },
        existingInvoices
      );

      if (!validation.isValid) {
        throw new Error(`Error de validación: ${validation.errors.join(', ')}`);
      }

      // Mostrar warnings si existen
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Advertencias de numeración:', validation.warnings);
      }

      // Generate structured transaction ID for invoice
      const transactionId = generateDocumentTransactionId({
        serie: 'FAC', // Serie para facturas
        numeroDocumento: newNumber,
        tipoDocumento: invoice.estado === 'nota_credito' ? '02' : invoice.estado === 'nota_debito' ? '03' : '01'
      });

      console.log('Generated invoice numbers:', { newNumber, controlNumber, transactionId });

      const insertData = {
        numero: newNumber,
        // transaction_id: transactionId, // ⚠️ TEMPORALMENTE COMENTADO - columna no existe en DB
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
        transaction_id: transactionId, // ✅ ASEGURAR que el transaction_id se retorne
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
        baseImponible: parseFloat(createdInvoice.base_imponible || createdInvoice.subtotal), // Use subtotal as fallback
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