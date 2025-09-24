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
        // Additional debug info for production issues
        console.log('Supabase client status:', {
          clientExists: !!supabase,
          url: supabase?.supabaseUrl,
          keyExists: !!supabase?.supabaseKey
        });

        // Test Supabase connection before inserting
        if (!supabase) {
          throw new Error('Cliente Supabase no inicializado correctamente');
        }

        const { data, error } = await supabase
          .from('customers')
          .insert([insertData])
          .select()
          .single();

        if (error) {
          console.error('Supabase error details:', error);

          // Handle specific database errors
          if (error.code === '23505') {
            throw new Error(`Ya existe un cliente con el RIF: ${insertData.rif}`);
          }

          if (error.code === '42501' || error.message.includes('RLS')) {
            throw new Error('Error de permisos. Verifica la configuración de Supabase.');
          }

          if (error.code === '23502') {
            throw new Error('Faltan campos obligatorios. Verifica que todos los datos estén completos.');
          }

          // Return the actual error message for debugging
          throw new Error(error.message || 'Error desconocido en la base de datos');
        }

        if (!data) {
          throw new Error('No se recibieron datos del servidor después de crear el cliente');
        }

        console.log('Customer created successfully:', data);

        // Return normalized customer object
        return {
          id: data.id,
          rif: data.rif,
          razonSocial: data.razon_social,
          nombre: data.nombre,
          domicilio: data.domicilio,
          telefono: data.telefono,
          email: data.email,
          tipoContribuyente: data.tipo_contribuyente,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

      } catch (dbError: any) {
        console.error('Database operation failed:', dbError);

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