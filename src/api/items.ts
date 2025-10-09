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
      console.log('Fetching items via REST API');

      // Use direct REST API to avoid supabase-js headers issues
      const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

      const response = await fetch(`${SUPABASE_URL}/rest/v1/items?order=created_at.desc`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      });

      console.log('Items fetch response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error fetching items:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Items fetched via REST API:', data?.length || 0, 'records');

      if (!Array.isArray(data)) {
        console.error('Invalid items response format:', data);
        return [];
      }

      return data.map(row => ({
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
      console.log('Creating item via REST API:', item);

      // Use direct REST API to avoid supabase-js headers issues
      const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

      const insertData = {
        codigo: String(item.codigo || '').trim().toUpperCase(),
        descripcion: String(item.descripcion || '').trim(),
        tipo: item.tipo || 'producto',
        precio_base: Number(item.precioBase) || 0,
        iva_aplica: Boolean(item.ivaAplica),
      };

      console.log('Normalized item data:', insertData);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(insertData)
      });

      console.log('Create item response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error creating item:', errorText);
        if (response.status === 409) {
          throw new Error(`Ya existe un producto con el código: ${insertData.codigo}`);
        }
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Item created via REST API:', data);

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No se recibieron datos del servidor');
      }

      const createdItem = data[0];

      return {
        id: createdItem.id,
        codigo: createdItem.codigo,
        descripcion: createdItem.descripcion,
        tipo: createdItem.tipo,
        precioBase: parseFloat(createdItem.precio_base),
        ivaAplica: createdItem.iva_aplica,
        createdAt: createdItem.created_at,
        updatedAt: createdItem.updated_at,
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
      console.log('Updating item via REST API:', { id, ...item });

      // Use direct REST API to avoid supabase-js headers issues
      const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

      const updateData = {
        codigo: String(item.codigo || '').trim().toUpperCase(),
        descripcion: String(item.descripcion || '').trim(),
        tipo: item.tipo || 'producto',
        precio_base: Number(item.precioBase) || 0,
        iva_aplica: Boolean(item.ivaAplica),
      };

      console.log('Normalized update data:', updateData);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/items?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      });

      console.log('Update item response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error updating item:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Item updated via REST API:', data);

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No se recibieron datos del servidor');
      }

      const updatedItem = data[0];

      return {
        id: updatedItem.id,
        codigo: updatedItem.codigo,
        descripcion: updatedItem.descripcion,
        tipo: updatedItem.tipo,
        precioBase: parseFloat(updatedItem.precio_base),
        ivaAplica: updatedItem.iva_aplica,
        createdAt: updatedItem.created_at,
        updatedAt: updatedItem.updated_at,
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
      console.log('Deleting item via REST API:', id);

      // Use direct REST API to avoid supabase-js headers issues
      const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

      const response = await fetch(`${SUPABASE_URL}/rest/v1/items?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      });

      console.log('Delete item response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error deleting item:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      console.log('Item deleted successfully via REST API');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
};