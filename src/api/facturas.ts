import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FacturaElectronica, DocumentoElectronico } from '@/types/facturacion';

// Supabase configuration
const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

// Interfaz para factura desde la base de datos
export interface FacturaDB {
  id: string;
  tipo_documento: string;
  numero_documento: string;
  serie: string;
  sucursal: string;
  fecha_emision: string;
  fecha_vencimiento?: string;
  hora_emision: string;

  // Cliente
  cliente_id?: string;
  cliente_tipo_id: string;
  cliente_numero_id: string;
  cliente_razon_social: string;
  cliente_direccion?: string;
  cliente_telefono?: string;
  cliente_correo?: string;

  // Vendedor
  vendedor_codigo?: string;
  vendedor_nombre?: string;
  num_cajero?: string;

  // Tipo de operación
  tipo_proveedor?: string;
  tipo_transaccion?: string;
  tipo_de_pago: string;
  tipo_de_venta: string;
  moneda: string;

  // Totales VES
  nro_items: number;
  monto_gravado_total: number;
  monto_exento_total: number;
  subtotal: number;
  total_descuento: number;
  subtotal_antes_descuento: number;
  total_iva: number;
  monto_total_con_iva: number;
  total_a_pagar: number;
  monto_en_letras?: string;

  // Totales USD
  moneda_secundaria?: string;
  tipo_cambio?: number;
  monto_gravado_total_usd?: number;
  monto_exento_total_usd?: number;
  subtotal_usd?: number;
  total_descuento_usd?: number;
  total_iva_usd?: number;
  monto_total_con_iva_usd?: number;
  total_a_pagar_usd?: number;
  monto_en_letras_usd?: string;

  // IGTF
  base_igtf?: number;
  alicuota_igtf?: number;
  monto_igtf?: number;
  base_igtf_usd?: number;
  monto_igtf_usd?: number;

  // Estado
  estado: string;
  anulado: boolean;
  motivo_anulacion?: string;

  // Factura afectada
  serie_factura_afectada?: string;
  numero_factura_afectada?: string;
  fecha_factura_afectada?: string;
  monto_factura_afectada?: number;
  comentario_factura_afectada?: string;

  // Orden
  numero_orden?: string;

  // TFHKA - Timbrado
  transaccion_id?: string;
  url_pdf?: string;

  // JSON completo
  documento_json?: any;

  // Auditoría
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

// Hook para obtener todas las facturas
export const useFacturas = () => {
  return useQuery({
    queryKey: ['facturas'],
    queryFn: async (): Promise<FacturaDB[]> => {
      try {
        console.log('Fetching facturas via REST API');

        const response = await fetch(`${SUPABASE_URL}/rest/v1/facturas_electronicas?order=fecha_emision.desc`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          }
        });

        console.log('Facturas fetch response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('REST API error fetching facturas:', errorText);
          return [];
        }

        const data = await response.json();
        console.log('Facturas fetched via REST API:', data?.length || 0, 'records');

        if (!Array.isArray(data)) {
          console.error('Invalid response format:', data);
          return [];
        }

        return data;
      } catch (error) {
        console.error('Error in useFacturas:', error);
        return [];
      }
    },
    retry: false,
  });
};

// Hook para obtener una factura por ID
export const useFactura = (id: string) => {
  return useQuery({
    queryKey: ['factura', id],
    queryFn: async (): Promise<FacturaDB | null> => {
      if (!id) return null;

      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/facturas_electronicas?id=eq.${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          }
        });

        if (!response.ok) {
          throw new Error('Error fetching factura');
        }

        const data = await response.json();
        return data && data.length > 0 ? data[0] : null;
      } catch (error) {
        console.error('Error fetching factura:', error);
        return null;
      }
    },
    enabled: !!id,
  });
};

// Hook para crear una factura
export const useCreateFactura = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (factura: Partial<FacturaDB>): Promise<FacturaDB> => {
      console.log('Creating factura with data:', factura);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/facturas_electronicas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(factura)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error creating factura:', errorText);
        throw new Error(`Error creating factura: ${errorText}`);
      }

      const data = await response.json();
      console.log('Factura created successfully:', data);

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No se recibieron datos del servidor');
      }

      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
    },
  });
};

// Hook para actualizar una factura
export const useUpdateFactura = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...factura }: Partial<FacturaDB> & { id: string }): Promise<FacturaDB> => {
      console.log('Updating factura:', id, factura);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/facturas_electronicas?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(factura)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error updating factura:', errorText);
        throw new Error(`Error updating factura: ${errorText}`);
      }

      const data = await response.json();
      console.log('Factura updated successfully:', data);

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No se recibieron datos del servidor');
      }

      return data[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
      queryClient.invalidateQueries({ queryKey: ['factura', variables.id] });
    },
  });
};

// Hook para anular una factura
export const useAnularFactura = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }): Promise<void> => {
      console.log('Anulando factura:', id, 'Motivo:', motivo);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/facturas_electronicas?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          anulado: true,
          estado: 'anulada',
          motivo_anulacion: motivo
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error anulando factura:', errorText);
        throw new Error(`Error anulando factura: ${errorText}`);
      }

      console.log('Factura anulada successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
    },
  });
};

// Hook para eliminar una factura (solo borradores)
export const useDeleteFactura = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      console.log('Deleting factura:', id);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/facturas_electronicas?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error deleting factura:', errorText);
        throw new Error(`Error deleting factura: ${errorText}`);
      }

      console.log('Factura deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
    },
  });
};

// Interfaz para items de factura
export interface FacturaItemDB {
  id: string;
  factura_id: string;
  numero_linea: number;
  item_id?: string;
  codigo_plu: string;
  indicador_bien_servicio: string;
  descripcion: string;
  codigo_ciiu?: string;
  cantidad: number;
  unidad_medida: string;
  precio_unitario: number;
  precio_unitario_descuento?: number;
  descuento_monto: number;
  monto_bonificacion: number;
  descrip_bonificacion?: string;
  recargo_monto: number;
  precio_item: number;
  codigo_impuesto?: string;
  tasa_iva: number;
  valor_iva: number;
  valor_total_item: number;
  info_adicional_item?: any;
  created_at: string;
  updated_at: string;
}

// Hook para obtener items de una factura
export const useFacturaItems = (facturaId: string) => {
  return useQuery({
    queryKey: ['factura-items', facturaId],
    queryFn: async (): Promise<FacturaItemDB[]> => {
      if (!facturaId) return [];

      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/facturas_items?factura_id=eq.${facturaId}&order=numero_linea.asc`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            }
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('REST API error fetching factura items:', errorText);
          return [];
        }

        const data = await response.json();
        return data || [];
      } catch (error) {
        console.error('Error fetching factura items:', error);
        return [];
      }
    },
    enabled: !!facturaId,
  });
};
