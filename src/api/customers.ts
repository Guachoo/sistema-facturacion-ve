import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Customer } from '@/types';

// Mock data for development
const mockCustomers: Customer[] = [
  {
    id: '1',
    rif: 'J-12345678-9',
    razonSocial: 'Empresa Demo C.A.',
    nombre: 'Empresa Demo',
    domicilio: 'Caracas, Venezuela',
    telefono: '+58-212-1234567',
    email: 'demo@empresa.com',
    tipoContribuyente: 'especial',
  },
  {
    id: '2',
    rif: 'V-87654321-0',
    razonSocial: 'Juan Pérez',
    domicilio: 'Valencia, Carabobo, Venezuela',
    telefono: '+58-241-9876543',
    email: 'juan@email.com',
    tipoContribuyente: 'ordinario',
  },
];

export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async (): Promise<Customer[]> => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        rif: row.rif,
        razonSocial: row.razon_social,
        nombre: row.nombre,
        domicilio: row.domicilio,
        telefono: row.telefono,
        email: row.email,
        tipoContribuyente: row.tipo_contribuyente,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },
  });
};

// Helper function to normalize string values
const normalizeString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
      console.log('Creating customer with raw data:', customer);

      // Normalize all data to prevent undefined/null header issues
      const insertData = {
        rif: normalizeString(customer.rif)?.toUpperCase() || '',
        razon_social: normalizeString(customer.razonSocial) || '',
        nombre: normalizeString(customer.nombre),
        domicilio: normalizeString(customer.domicilio) || '',
        telefono: normalizeString(customer.telefono),
        email: normalizeString(customer.email),
        tipo_contribuyente: customer.tipoContribuyente || 'ordinario',
      };

      // Validate required fields
      if (!insertData.rif) {
        throw new Error('RIF es requerido');
      }
      if (!insertData.razon_social) {
        throw new Error('Razón social es requerida');
      }
      if (!insertData.domicilio) {
        throw new Error('Domicilio es requerido');
      }

      console.log('Normalized data for Supabase:', insertData);

      try {
        // BYPASS SUPABASE-JS COMPLETELY - Use direct REST API
        const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

        console.log('Using direct REST API to bypass supabase-js headers issue');

        const response = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(insertData)
        });

        console.log('Fetch response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('REST API error:', errorText);
          throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('REST API response:', data);

        if (!data || !Array.isArray(data) || data.length === 0) {
          throw new Error('No se recibieron datos del servidor');
        }

        const createdCustomer = data[0];

        console.log('Customer created successfully via REST API:', createdCustomer);

        // Return normalized customer object
        return {
          id: createdCustomer.id,
          rif: createdCustomer.rif,
          razonSocial: createdCustomer.razon_social,
          nombre: createdCustomer.nombre,
          domicilio: createdCustomer.domicilio,
          telefono: createdCustomer.telefono,
          email: createdCustomer.email,
          tipoContribuyente: createdCustomer.tipo_contribuyente,
          createdAt: createdCustomer.created_at,
          updatedAt: createdCustomer.updated_at,
        };

      } catch (dbError: any) {
        console.error('REST API operation failed:', dbError);

        // Handle specific HTTP/REST errors
        if (dbError.message?.includes('409') || dbError.message?.includes('duplicate')) {
          throw new Error(`Ya existe un cliente con el RIF: ${insertData.rif}`);
        }

        if (dbError.message?.includes('401') || dbError.message?.includes('403')) {
          throw new Error('Error de permisos. Verifica la configuración de Supabase.');
        }

        if (dbError.message?.includes('400')) {
          throw new Error('Datos inválidos. Verifica que todos los campos estén completos.');
        }

        // Re-throw with original message for better debugging
        throw new Error(dbError.message || 'Error en la operación de base de datos');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...customer }: Customer): Promise<Customer> => {
      const { data, error } = await supabase
        .from('customers')
        .update({
          rif: customer.rif,
          razon_social: customer.razonSocial,
          nombre: customer.nombre,
          domicilio: customer.domicilio,
          telefono: customer.telefono,
          email: customer.email,
          tipo_contribuyente: customer.tipoContribuyente,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        rif: data.rif,
        razonSocial: data.razon_social,
        nombre: data.nombre,
        domicilio: data.domicilio,
        telefono: data.telefono,
        email: data.email,
        tipoContribuyente: data.tipo_contribuyente,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};