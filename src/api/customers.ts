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

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
      const { data, error } = await supabase
        .from('customers')
        .insert([{
          rif: customer.rif,
          razon_social: customer.razonSocial,
          nombre: customer.nombre,
          domicilio: customer.domicilio,
          telefono: customer.telefono,
          email: customer.email,
          tipo_contribuyente: customer.tipoContribuyente,
        }])
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