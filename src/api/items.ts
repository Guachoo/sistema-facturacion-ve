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
    precioBase: 150000, // VES
    ivaAplica: true,
    stockActual: 100,
    stockMinimo: 10,
    stockMaximo: 200,
    costoPromedio: 140000,
    ubicacion: 'Oficina Principal',
    categoria: 'Servicios',
    activo: true,
  },
  {
    id: '2',
    codigo: 'SERV-002',
    descripcion: 'Desarrollo Web',
    tipo: 'servicio',
    precioBase: 500000, // VES
    ivaAplica: true,
    stockActual: 100,
    stockMinimo: 5,
    stockMaximo: 100,
    costoPromedio: 480000,
    ubicacion: 'Oficina Principal',
    categoria: 'Servicios',
    activo: true,
  },
  {
    id: '3',
    codigo: 'PROD-001',
    descripcion: 'Software de Gestión',
    tipo: 'producto',
    precioBase: 250000, // VES
    ivaAplica: true,
    stockActual: 50,
    stockMinimo: 5,
    stockMaximo: 100,
    costoPromedio: 230000,
    ubicacion: 'Almacén A',
    categoria: 'Software',
    activo: true,
  },
  {
    id: '4',
    codigo: 'PROD-002',
    descripcion: 'Licencia Office 365',
    tipo: 'producto',
    precioBase: 120000,
    ivaAplica: true,
    stockActual: 25,
    stockMinimo: 5,
    stockMaximo: 50,
    costoPromedio: 110000,
    ubicacion: 'Digital',
    categoria: 'Software',
    activo: true,
  },
  {
    id: '5',
    codigo: 'PROD-003',
    descripcion: 'Computadora Portátil',
    tipo: 'producto',
    precioBase: 1200000,
    ivaAplica: true,
    stockActual: 15,
    stockMinimo: 3,
    stockMaximo: 30,
    costoPromedio: 1100000,
    ubicacion: 'Almacén B',
    categoria: 'Hardware',
    activo: true,
  },
  {
    id: '6',
    codigo: 'SERV-003',
    descripcion: 'Soporte Técnico',
    tipo: 'servicio',
    precioBase: 80000,
    ivaAplica: true,
    stockActual: 100,
    stockMinimo: 10,
    stockMaximo: 200,
    costoPromedio: 75000,
    ubicacion: 'Oficina Principal',
    categoria: 'Servicios',
    activo: true,
  },
  {
    id: '7',
    codigo: 'PROD-004',
    descripcion: 'Mouse Inalámbrico',
    tipo: 'producto',
    precioBase: 35000,
    ivaAplica: true,
    stockActual: 80,
    stockMinimo: 20,
    stockMaximo: 100,
    costoPromedio: 30000,
    ubicacion: 'Almacén C',
    categoria: 'Accesorios',
    activo: true,
  },
  {
    id: '8',
    codigo: 'SERV-004',
    descripcion: 'Capacitación en Software',
    tipo: 'servicio',
    precioBase: 200000,
    ivaAplica: true,
    stockActual: 100,
    stockMinimo: 5,
    stockMaximo: 50,
    costoPromedio: 180000,
    ubicacion: 'Aula Virtual',
    categoria: 'Servicios',
    activo: true,
  },
];

export const useItems = () => {
  return useQuery({
    queryKey: ['items'],
    queryFn: async (): Promise<Item[]> => {
      console.log('Fetching items via REST API');

      try {
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

        if (response.status === 404 || response.status === 406) {
          // Table doesn't exist yet, return mock data
          console.log('Items table not found, using mock data');
          return mockItems;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('REST API error fetching items:', errorText);
          // Fallback to mock data on error
          return mockItems;
        }

        const data = await response.json();
        console.log('Items fetched via REST API:', data?.length || 0, 'records');

        // Map database items
        const dbItems = Array.isArray(data) ? data.map(row => ({
          id: row.id,
          codigo: row.codigo,
          descripcion: row.descripcion,
          tipo: row.tipo,
          precioBase: parseFloat(row.precio_base) || 0,
          ivaAplica: row.iva_aplica !== false, // Default to true
          stockActual: row.stock_actual || 100, // Default stock for services
          stockMinimo: row.stock_minimo || 0,
          stockMaximo: row.stock_maximo || 1000,
          costoPromedio: parseFloat(row.costo_promedio) || 0,
          ubicacion: row.ubicacion || 'No especificada',
          categoria: row.categoria || 'General',
          activo: row.activo !== false, // Default to true if not specified
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })) : [];

        console.log('Items loaded from database:', dbItems.length);
        return dbItems;

      } catch (error) {
        console.error('Error fetching items:', error);
        throw error;
      }
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