import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for Quotations
export interface QuotationItem {
  id: string;
  quotation_id: string;
  item_id: string;
  nombre: string;
  descripcion?: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  total: number;
}

export interface Quotation {
  id: string;
  numero: string;
  cliente_id: string;
  cliente_nombre: string;
  cliente_email?: string;  cliente_rif?: string;
  cliente_domicilio?: string; // ✅ NUEVO (opcional)
  fecha_creacion: string;
  fecha_vencimiento: string;
  estado: 'borrador' | 'enviada' | 'aprobada' | 'rechazada' | 'convertida';
  subtotal: number;
  descuento_global: number;
  iva: number;
  total: number;
  observaciones?: string;
  items: QuotationItem[];
  vendedor_id: string;
  vendedor_nombre: string;
  valida_hasta?: string;
  created_at?: string;
  updated_at?: string;
}

// Supabase configuration
const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

// Helper function to normalize string values
const normalizeString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

// Generate next quotation number
const generateQuotationNumber = (): string => {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `COT-${year}${month}-${random}`;
};

export const useQuotations = () => {
  return useQuery({
    queryKey: ['quotations'],
    queryFn: async (): Promise<Quotation[]> => {
      console.log('Fetching quotations from Supabase');

      const response = await fetch(`${SUPABASE_URL}/rest/v1/quotations?order=created_at.desc`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching quotations:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Quotations fetched:', data?.length || 0, 'records');

      if (!Array.isArray(data)) {
        console.error('Invalid quotations response format:', data);
        throw new Error('Invalid response format from server');
      }

      // Transform database data to match our interface
      return data.map(row => ({
        id: row.id,
        numero: row.numero,
        cliente_id: row.cliente_id || '',
        cliente_nombre: row.cliente_nombre,
        cliente_email: row.cliente_email, cliente_rif: row.cliente_rif,
        fecha_creacion: row.fecha_creacion,
        fecha_vencimiento: row.fecha_vencimiento,
        estado: row.estado,
        subtotal: parseFloat(row.subtotal) || 0,
        descuento_global: parseFloat(row.descuento_global) || 0,
        iva: parseFloat(row.iva) || 0,
        total: parseFloat(row.total) || 0,
        observaciones: row.observaciones,
        vendedor_id: row.vendedor_id || '',
        vendedor_nombre: row.vendedor_nombre,
        valida_hasta: row.valida_hasta,
        created_at: row.created_at,
        updated_at: row.updated_at,
        items: [] // Items will be fetched separately if needed
      }));
    },
  });
};

export const useCreateQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quotation: Omit<Quotation, 'id' | 'numero' | 'created_at' | 'updated_at'>): Promise<Quotation> => {
      console.log('Creating quotation:', quotation);

      const insertData = {
        numero: generateQuotationNumber(),
        cliente_id: quotation.cliente_id,
        cliente_nombre: normalizeString(quotation.cliente_nombre) || '',
        cliente_email: normalizeString(quotation.cliente_email),
        fecha_creacion: quotation.fecha_creacion,
        fecha_vencimiento: quotation.fecha_vencimiento,
        estado: quotation.estado || 'borrador',
        subtotal: quotation.subtotal || 0,
        descuento_global: quotation.descuento_global || 0,
        iva: quotation.iva || 0,
        total: quotation.total || 0,
        observaciones: normalizeString(quotation.observaciones),
        vendedor_id: quotation.vendedor_id,
        vendedor_nombre: normalizeString(quotation.vendedor_nombre) || '',
        valida_hasta: quotation.valida_hasta,
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/quotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(insertData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating quotation:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const createdQuotation = Array.isArray(data) ? data[0] : data;

      console.log('Quotation created:', createdQuotation);

      // Create quotation items if they exist
      if (quotation.items && quotation.items.length > 0) {
        await Promise.all(
          quotation.items.map(item =>
            fetch(`${SUPABASE_URL}/rest/v1/quotation_items`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                quotation_id: createdQuotation.id,
                item_id: item.item_id,
                nombre: item.nombre,
                descripcion: item.descripcion,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                descuento: item.descuento,
                total: item.total
              })
            })
          )
        );
      }

      return {
        ...createdQuotation,
        items: quotation.items || []
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
};

export const useUpdateQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...quotation }: Quotation): Promise<Quotation> => {
      console.log('Updating quotation:', { id, ...quotation });

      const updateData = {
        cliente_id: quotation.cliente_id,
        cliente_nombre: normalizeString(quotation.cliente_nombre) || '',
        cliente_email: normalizeString(quotation.cliente_email),
        fecha_creacion: quotation.fecha_creacion,
        fecha_vencimiento: quotation.fecha_vencimiento,
        estado: quotation.estado,
        subtotal: quotation.subtotal,
        descuento_global: quotation.descuento_global,
        iva: quotation.iva,
        total: quotation.total,
        observaciones: normalizeString(quotation.observaciones),
        vendedor_id: quotation.vendedor_id,
        vendedor_nombre: normalizeString(quotation.vendedor_nombre) || '',
        valida_hasta: quotation.valida_hasta,
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/quotations?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const updatedQuotation = Array.isArray(data) ? data[0] : data;

      return {
        ...updatedQuotation,
        items: quotation.items || []
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
};

export const useDeleteQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      console.log('Deleting quotation:', id);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/quotations?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      console.log('Quotation deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
};

// Function to convert quotation to invoice
export const useConvertQuotationToInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quotationId: string): Promise<void> => {
      console.log('Converting quotation to invoice:', quotationId);

      // Update quotation status to 'convertida'
      const response = await fetch(`${SUPABASE_URL}/rest/v1/quotations?id=eq.${quotationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          estado: 'convertida'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      console.log('Quotation converted to invoice successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

// =====================================================
// GESTIÓN AVANZADA DE ESTADOS DE COTIZACIONES
// =====================================================

export type QuotationStatus = 'borrador' | 'enviada' | 'aprobada' | 'rechazada' | 'convertida';

export interface QuotationStatusChange {
  quotationId: string;
  newStatus: QuotationStatus;
  reason?: string;
  changedBy?: string;
}

export interface QuotationStats {
  total: number;
  borradores: number;
  enviadas: number;
  aprobadas: number;
  rechazadas: number;
  convertidas: number;
  conversionRate: number;
  valor_total: number;
}

// Cambiar estado de cotización
export const useChangeQuotationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quotationId, newStatus, reason }: QuotationStatusChange): Promise<void> => {
      console.log(`Changing quotation ${quotationId} status to:`, newStatus);

      const updateData: any = {
        estado: newStatus,
        updated_at: new Date().toISOString()
      };

      // Si es rechazo, incluir motivo
      if (newStatus === 'rechazada' && reason) {
        updateData.observaciones = reason;
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/quotations?id=eq.${quotationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      console.log(`Quotation status changed to ${newStatus} successfully`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation-stats'] });
    },
  });
};

// Obtener estadísticas de cotizaciones
export const useQuotationStats = () => {
  return useQuery({
    queryKey: ['quotation-stats'],
    queryFn: async (): Promise<QuotationStats> => {
      console.log('Fetching quotation statistics');

      const response = await fetch(`${SUPABASE_URL}/rest/v1/quotations?select=estado,total`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error fetching quotation stats');
      }

      const quotations = await response.json();

      if (!Array.isArray(quotations)) {
        throw new Error('Invalid response format from server');
      }

      const stats = quotations.reduce(
        (acc, q) => {
          acc.total++;
          const monto = parseFloat(q.total) || 0;
          acc.valor_total += monto;
          switch (q.estado) {
            case 'borrador':
              acc.borradores++;
              break;
            case 'enviada':
              acc.enviadas++;
              break;
            case 'aprobada':
              acc.aprobadas++;
              break;
            case 'rechazada':
              acc.rechazadas++;
              break;
            case 'convertida':
              acc.convertidas++;
              break;
          }
          return acc;
        },
        {
          total: 0,
          borradores: 0,
          enviadas: 0,
          aprobadas: 0,
          rechazadas: 0,
          convertidas: 0,
          conversionRate: 0,
          valor_total: 0,
        }
      );

      // Calcular tasa de conversión
      stats.conversionRate = stats.enviadas > 0 ? (stats.convertidas / stats.enviadas) * 100 : 0;

      return stats;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
};

// Validar si se puede cambiar estado
export const canChangeStatus = (currentStatus: QuotationStatus, newStatus: QuotationStatus): boolean => {
  const validTransitions: Record<QuotationStatus, QuotationStatus[]> = {
    borrador: ['enviada'],
    enviada: ['aprobada', 'rechazada'],
    aprobada: ['convertida'],
    rechazada: ['borrador'], // Permitir revisar cotización rechazada
    convertida: [], // Estado final
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

// Obtener acciones disponibles para una cotización
export const getAvailableActions = (quotation: any, userRole: string = 'vendedor') => {
  const actions = [];

  switch (quotation.estado) {
    case 'borrador':
      actions.push({
        key: 'edit',
        label: 'Editar',
        icon: 'edit',
        variant: 'secondary'
      });
      actions.push({
        key: 'send',
        label: 'Enviar al Cliente',
        icon: 'send',
        variant: 'primary'
      });
      break;

    case 'enviada':
      actions.push({
        key: 'approve',
        label: 'Aprobar',
        icon: 'check',
        variant: 'success'
      });
      actions.push({
        key: 'reject',
        label: 'Rechazar',
        icon: 'x',
        variant: 'danger'
      });
      break;

    case 'aprobada':
      actions.push({
        key: 'convert',
        label: 'Convertir a Factura',
        icon: 'file-text',
        variant: 'primary'
      });
      break;

    case 'rechazada':
      actions.push({
        key: 'review',
        label: 'Revisar y Reenviar',
        icon: 'refresh',
        variant: 'warning'
      });
      break;

    case 'convertida':
      actions.push({
        key: 'view-invoice',
        label: 'Ver Factura',
        icon: 'eye',
        variant: 'info'
      });
      break;
  }

  // Siempre permitir ver detalles
  actions.unshift({
    key: 'view',
    label: 'Ver Detalles',
    icon: 'eye',
    variant: 'secondary'
  });

  return actions;
};

// Función mejorada de conversión a factura
export const useConvertQuotationToInvoiceAdvanced = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quotationId: string): Promise<{ invoiceId: string }> => {
      console.log('Converting quotation to invoice (advanced):', quotationId);

      // 1. Obtener los datos de la cotización
      const quotationResponse = await fetch(`${SUPABASE_URL}/rest/v1/quotations?id=eq.${quotationId}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!quotationResponse.ok) {
        throw new Error('Error obteniendo datos de la cotización');
      }

      const quotations = await quotationResponse.json();
      const quotation = quotations[0];

      if (!quotation) {
        throw new Error('Cotización no encontrada');
      }

      if (quotation.estado !== 'aprobada') {
        throw new Error('Solo se pueden convertir cotizaciones aprobadas');
      }

      // 2. Obtener items de la cotización
      const itemsResponse = await fetch(`${SUPABASE_URL}/rest/v1/quotation_items?quotation_id=eq.${quotationId}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const quotationItems = await itemsResponse.json();

      // 3. Crear la factura con datos completos
      const invoiceData = {
        fecha: new Date().toISOString(),

        // Emisor (datos de la empresa)
        emisor_nombre: 'Mi Empresa C.A.',
        emisor_rif: 'J-12345678-9',
        emisor_domicilio: 'Caracas, Venezuela',

        // Receptor (desde la cotización)
        customer_id: quotation.cliente_id,
        receptor_rif: quotation.cliente_rif,
        receptor_razon_social: quotation.cliente_nombre,
        receptor_domicilio: quotation.cliente_domicilio || '',
        receptor_tipo_contribuyente: 'ordinario',

        // Líneas de factura (convertir items de cotización)
        lineas: quotationItems.map((item: any) => ({
          item_id: item.item_id,
          codigo: item.nombre || 'ITEM',
          descripcion: item.descripcion,
          cantidad: parseFloat(item.cantidad),
          precio_unitario: parseFloat(item.precio_unitario),
          descuento: parseFloat(item.descuento || 0),
          total: parseFloat(item.total)
        })),

        // Totales
        subtotal: parseFloat(quotation.subtotal),
        monto_iva: parseFloat(quotation.iva),
        monto_igtf: 0,
        total: parseFloat(quotation.total),
        total_usd_referencia: parseFloat(quotation.total) / 36.5,

        // BCV
        tasa_bcv: 36.5,
        fecha_tasa_bcv: new Date().toISOString().split('T')[0],

        // Metadata
        canal: 'digital',
        estado: 'emitida',

        // Pagos básicos
        pagos: [{
          forma_pago: 'transferencia',
          monto: parseFloat(quotation.total)
        }]
      };

      // Crear factura usando el API de invoices existente
      const invoiceResponse = await fetch(`${SUPABASE_URL}/rest/v1/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(invoiceData)
      });

      if (!invoiceResponse.ok) {
        const errorText = await invoiceResponse.text();
        throw new Error(`Error creando factura: ${errorText}`);
      }

      const invoiceData_response = await invoiceResponse.json();
      const createdInvoice = Array.isArray(invoiceData_response) ? invoiceData_response[0] : invoiceData_response;

      // 4. Actualizar estado de la cotización
      const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/quotations?id=eq.${quotationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          estado: 'convertida',
          updated_at: new Date().toISOString()
        })
      });

      if (!updateResponse.ok) {
        throw new Error('Error actualizando estado de cotización');
      }

      console.log('Quotation converted to invoice successfully:', createdInvoice.id);

      return { invoiceId: createdInvoice.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation-stats'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};
