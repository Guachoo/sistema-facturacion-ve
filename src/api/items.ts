import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Item } from '@/types';

// Mock data for development
const mockItems: Item[] = [
  {
    id: '1',
    codigo: 'SERV-001',
    descripcion: 'Consultoría en Sistemas',
    tipo: 'servicio',
    precioBase: 50000, // VES
    ivaAplica: true,
  },
  {
    id: '2',
    codigo: 'PROD-001',
    descripcion: 'Software de Gestión',
    tipo: 'producto',
    precioBase: 150000, // VES
    ivaAplica: true,
  },
];

export const useItems = () => {
  return useQuery({
    queryKey: ['items'],
    queryFn: async (): Promise<Item[]> => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        codigo: row.codigo,
        descripcion: row.descripcion,
        tipo: row.tipo,
        precioBase: parseFloat(row.precio_base),
        ivaAplica: row.iva_aplica,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },
  });
};

export const useCreateItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<Item, 'id'>): Promise<Item> => {
      const { data, error } = await supabase
        .from('items')
        .insert([{
          codigo: item.codigo,
          descripcion: item.descripcion,
          tipo: item.tipo,
          precio_base: item.precioBase,
          iva_aplica: item.ivaAplica,
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        codigo: data.codigo,
        descripcion: data.descripcion,
        tipo: data.tipo,
        precioBase: parseFloat(data.precio_base),
        ivaAplica: data.iva_aplica,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
};

export const useUpdateItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...item }: Item): Promise<Item> => {
      const { data, error } = await supabase
        .from('items')
        .update({
          codigo: item.codigo,
          descripcion: item.descripcion,
          tipo: item.tipo,
          precio_base: item.precioBase,
          iva_aplica: item.ivaAplica,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        codigo: data.codigo,
        descripcion: data.descripcion,
        tipo: data.tipo,
        precioBase: parseFloat(data.precio_base),
        ivaAplica: data.iva_aplica,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
};

export const useDeleteItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
};