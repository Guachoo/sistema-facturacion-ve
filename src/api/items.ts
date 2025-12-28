import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Item } from '@/types';

// PHASE 2: Enhanced mock data with fiscal information and varied pricing
const mockItems: Item[] = [
  {
    id: '1',
    codigo: 'SERV-001',
    descripcion: 'Consultoría en Sistemas',
    tipo: 'servicio',
    precioBase: 50, // USD 50.00
    ivaAplica: true,
    stockActual: 100,
    stockMinimo: 10,
    stockMaximo: 200,
    costoPromedio: 45, // ~90% of price
    ubicacion: 'Oficina Principal',
    categoria: 'Servicios',
    activo: true,
    // PHASE 2: Fiscal fields
    codigoSeniat: '84710000',
    categoriaSeniat: 'servicio',
    unidadMedida: 'hora',
    origenFiscal: 'nacional',
    alicuotaIva: 16,
    exentoIva: false,
    retencionIslr: true,
    codigoActividad: '620100',
    clasificacionFiscal: 'gravado'
  },
  {
    id: '2',
    codigo: 'SERV-002',
    descripcion: 'Desarrollo Web',
    tipo: 'servicio',
    precioBase: 150, // USD 150.00
    ivaAplica: true,
    stockActual: 100,
    stockMinimo: 5,
    stockMaximo: 100,
    costoPromedio: 6370000,
    ubicacion: 'Oficina Principal',
    categoria: 'Servicios',
    activo: true,
    // PHASE 2: Fiscal fields
    codigoSeniat: '84710001',
    categoriaSeniat: 'servicio',
    unidadMedida: 'proyecto',
    origenFiscal: 'nacional',
    alicuotaIva: 16,
    exentoIva: false,
    retencionIslr: true,
    codigoActividad: '620200',
    clasificacionFiscal: 'gravado'
  },
  {
    id: '3',
    codigo: 'PROD-001',
    descripcion: 'Software de Gestión',
    tipo: 'producto',
    precioBase: 100, // USD 100.00
    ivaAplica: true,
    stockActual: 50,
    stockMinimo: 5,
    stockMaximo: 100,
    costoPromedio: 4095000,
    ubicacion: 'Almacén A',
    categoria: 'Software',
    activo: true,
    // PHASE 2: Fiscal fields
    codigoSeniat: '85249900',
    categoriaSeniat: 'bien',
    unidadMedida: 'unidad',
    origenFiscal: 'nacional',
    alicuotaIva: 16,
    exentoIva: false,
    retencionIslr: false,
    codigoActividad: '582100',
    clasificacionFiscal: 'gravado'
  },
  {
    id: '4',
    codigo: 'PROD-002',
    descripcion: 'Licencia Office 365',
    tipo: 'producto',
    precioBase: 30, // USD 30.00
    ivaAplica: true,
    stockActual: 3,
    stockMinimo: 5,
    stockMaximo: 50,
    costoPromedio: 1228500,
    ubicacion: 'Digital',
    categoria: 'Software',
    activo: true,
    // PHASE 2: Fiscal fields
    codigoSeniat: '85249900',
    categoriaSeniat: 'bien',
    unidadMedida: 'unidad',
    origenFiscal: 'nacional',
    alicuotaIva: 16,
    exentoIva: false,
    retencionIslr: false,
    codigoActividad: '582100',
    clasificacionFiscal: 'gravado'
  },
  {
    id: '5',
    codigo: 'PROD-003',
    descripcion: 'Computadora Portátil',
    tipo: 'producto',
    precioBase: 750, // USD 750.00
    ivaAplica: true,
    stockActual: 0,
    stockMinimo: 3,
    stockMaximo: 30,
    costoPromedio: 30712500,
    ubicacion: 'Almacén B',
    categoria: 'Hardware',
    activo: true,
    // PHASE 2: Fiscal fields
    codigoSeniat: '84713000',
    categoriaSeniat: 'bien',
    unidadMedida: 'unidad',
    origenFiscal: 'importado',
    alicuotaIva: 16,
    exentoIva: false,
    retencionIslr: false,
    codigoArancelario: '8471300000',
    clasificacionFiscal: 'gravado'
  },
  {
    id: '6',
    codigo: 'SERV-003',
    descripcion: 'Soporte Técnico',
    tipo: 'servicio',
    precioBase: 25, // USD 25.00
    ivaAplica: true,
    stockActual: 100,
    stockMinimo: 10,
    stockMaximo: 200,
    costoPromedio: 1023750,
    ubicacion: 'Oficina Principal',
    categoria: 'Servicios',
    activo: true,
    // PHASE 2: Fiscal fields
    codigoSeniat: '62020000',
    categoriaSeniat: 'servicio',
    unidadMedida: 'hora',
    origenFiscal: 'nacional',
    alicuotaIva: 16,
    exentoIva: false,
    retencionIslr: true,
    codigoActividad: '620200',
    clasificacionFiscal: 'gravado'
  },
  {
    id: '7',
    codigo: 'PROD-004',
    descripcion: 'Mouse Inalámbrico',
    tipo: 'producto',
    precioBase: 15, // USD 15.00
    ivaAplica: true,
    stockActual: 80,
    stockMinimo: 20,
    stockMaximo: 100,
    costoPromedio: 591375,
    ubicacion: 'Almacén C',
    categoria: 'Accesorios',
    activo: true,
    // PHASE 2: Fiscal fields
    codigoSeniat: '84733000',
    categoriaSeniat: 'bien',
    unidadMedida: 'unidad',
    origenFiscal: 'importado',
    alicuotaIva: 16,
    exentoIva: false,
    retencionIslr: false,
    codigoArancelario: '8473300000',
    clasificacionFiscal: 'gravado'
  },
  {
    id: '8',
    codigo: 'SERV-004',
    descripcion: 'Capacitación en Software',
    tipo: 'servicio',
    precioBase: 70, // USD 70.00
    ivaAplica: true,
    stockActual: 100,
    stockMinimo: 5,
    stockMaximo: 50,
    costoPromedio: 2866500,
    ubicacion: 'Aula Virtual',
    categoria: 'Servicios',
    activo: true,
    // PHASE 2: Fiscal fields
    codigoSeniat: '85590000',
    categoriaSeniat: 'servicio',
    unidadMedida: 'hora',
    origenFiscal: 'nacional',
    alicuotaIva: 16,
    exentoIva: false,
    retencionIslr: true,
    codigoActividad: '855900',
    clasificacionFiscal: 'gravado'
  },
  {
    id: '9',
    codigo: 'PROD-005',
    descripcion: 'Desarrollo App General',
    tipo: 'producto',
    precioBase: 125, // USD 125.00
    ivaAplica: true,
    stockActual: 100,
    stockMinimo: 5,
    stockMaximo: 150,
    costoPromedio: 5118750,
    ubicacion: 'Oficina Principal',
    categoria: 'Software',
    activo: true,
    // PHASE 2: Fiscal fields
    codigoSeniat: '84710001',
    categoriaSeniat: 'bien',
    unidadMedida: 'unidad',
    origenFiscal: 'nacional',
    alicuotaIva: 16,
    exentoIva: false,
    retencionIslr: true,
    codigoActividad: '620100',
    clasificacionFiscal: 'gravado'
  },
  {
    id: '10',
    codigo: 'PROD-006',
    descripcion: 'Teclado Mecánico Gaming',
    tipo: 'producto',
    precioBase: 80, // USD 80.00
    ivaAplica: true,
    stockActual: 25,
    stockMinimo: 5,
    stockMaximo: 50,
    costoPromedio: 3276000,
    ubicacion: 'Almacén C',
    categoria: 'Accesorios',
    activo: true,
    // PHASE 2: Fiscal fields
    codigoSeniat: '84733000',
    categoriaSeniat: 'bien',
    unidadMedida: 'unidad',
    origenFiscal: 'importado',
    alicuotaIva: 16,
    exentoIva: false,
    retencionIslr: false,
    codigoArancelario: '8473300000',
    clasificacionFiscal: 'gravado'
  },
  {
    id: '11',
    codigo: 'SERV-006',
    descripcion: 'Auditoría de Seguridad IT',
    tipo: 'servicio',
    precioBase: 200, // USD 200.00
    ivaAplica: true,
    stockActual: 100,
    stockMinimo: 2,
    stockMaximo: 20,
    costoPromedio: 8190000,
    ubicacion: 'Oficina Principal',
    categoria: 'Servicios',
    activo: true,
    // PHASE 2: Fiscal fields
    codigoSeniat: '62020000',
    categoriaSeniat: 'servicio',
    unidadMedida: 'proyecto',
    origenFiscal: 'nacional',
    alicuotaIva: 16,
    exentoIva: false,
    retencionIslr: true,
    codigoActividad: '620200',
    clasificacionFiscal: 'gravado'
  },
  {
    id: '12',
    codigo: 'PROD-007',
    descripcion: 'Monitor 4K 27 pulgadas',
    tipo: 'producto',
    precioBase: 300, // USD 300.00
    ivaAplica: true,
    stockActual: 2,
    stockMinimo: 3,
    stockMaximo: 25,
    costoPromedio: 12285000,
    ubicacion: 'Almacén B',
    categoria: 'Hardware',
    activo: true,
    // PHASE 2: Fiscal fields
    codigoSeniat: '84713000',
    categoriaSeniat: 'bien',
    unidadMedida: 'unidad',
    origenFiscal: 'importado',
    alicuotaIva: 16,
    exentoIva: false,
    retencionIslr: false,
    codigoArancelario: '8471300000',
    clasificacionFiscal: 'gravado'
  },
];

export const useItems = () => {
  return useQuery({
    queryKey: ['items'],
    queryFn: async (): Promise<Item[]> => {
      console.log('Fetching items via REST API');

      try {
        // TEMPORARY: Use mock data for demonstration of varied pricing
        console.log('Using mock data for pricing demonstration');
        return mockItems;

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
        const dbItems = Array.isArray(data) ? data.map((row: any) => ({
          id: row.id,
          codigo: row.codigo,
          descripcion: row.descripcion,
          tipo: row.tipo,
          precioBase: parseFloat(row.precio_base) || 0,
          precioUsd: row.precio_usd ? parseFloat(row.precio_usd) : undefined,
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

        // TEMPORARY: Use mock data for better pricing display
        // If database items have zero prices, supplement with mock data
        if (dbItems.length > 0 && dbItems.every((item: Item) => item.precioBase === 0)) {
          console.log('Database items have zero prices, using mock data for demonstration');
          return mockItems;
        }

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

// Export function to access mock data
export const getMockItems = (): Item[] => {
  return mockItems;
};
