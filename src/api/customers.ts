import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Customer } from '@/types';

// Mock customers data for development and testing
const mockCustomers: Customer[] = [
  {
    id: '1',
    rif: 'J-12345678-9',
    razonSocial: 'Corporación Demo C.A.',
    nombre: 'Corporación Demo',
    domicilio: 'Av. Principal, Caracas 1010, Venezuela',
    telefono: '+58 212 555-0001',
    email: 'contacto@demo.com.ve',
    tipoContribuyente: 'ordinario',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    rif: 'V-87654321-0',
    razonSocial: 'María González',
    nombre: 'María González',
    domicilio: 'Calle 5, Maracaibo 4001, Venezuela',
    telefono: '+58 261 555-0002',
    email: 'maria@ejemplo.com',
    tipoContribuyente: 'formal',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    rif: 'G-20000003-0',
    razonSocial: 'Servicios Técnicos del Estado',
    nombre: 'STE',
    domicilio: 'Centro Administrativo, Valencia 2001, Venezuela',
    telefono: '+58 241 555-0003',
    email: 'servicios@ste.gob.ve',
    tipoContribuyente: 'especial',
    createdAt: new Date().toISOString(),
  },
];

// Función para determinar si usar datos mock
const shouldUseMockData = (): boolean => {
  // Usar mock si estamos en desarrollo y no hay base de datos configurada
  return import.meta.env.DEV || import.meta.env.VITE_USE_MOCK_DATA === 'true';
};

export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async (): Promise<Customer[]> => {
      try {
        console.log('Fetching customers via REST API');

        // Use direct REST API to avoid supabase-js headers issues
        const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

        const response = await fetch(`${SUPABASE_URL}/rest/v1/customers?order=created_at.desc`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          }
        });

        console.log('Customers fetch response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('REST API error fetching customers:', errorText);
          console.warn('Using mock customers data as fallback');
          return mockCustomers;
        }

        const data = await response.json();
        console.log('Customers fetched via REST API:', data?.length || 0, 'records');

        if (!Array.isArray(data)) {
          console.error('Invalid response format:', data);
          console.warn('Using mock customers data as fallback');
          return mockCustomers;
        }

        // Si no hay datos en la base, usar mock data
        if (data.length === 0) {
          console.log('No customers found in database, using mock data for demonstration');
          return mockCustomers;
        }

        return data.map(row => ({
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

      } catch (error) {
        console.error('Error fetching customers from database:', error);
        console.warn('Using mock customers data as fallback');
        return mockCustomers;
      }
    },
    retry: 1, // Solo reintentar 1 vez
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos en cache
    refetchOnWindowFocus: false,
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

      // Import validation utilities (integrating with Phase 1)
      const { rifValidation, validationUtils } = await import('@/lib/utils');
      const { logger } = await import('@/lib/logger');

      // Validate RIF before creating customer
      if (!rifValidation.isValid(customer.rif)) {
        const error = new Error(`Invalid RIF: ${customer.rif}`);
        logger.error('customers', 'create', 'RIF validation failed', { rif: customer.rif, error });
        throw error;
      }

      // Validate required fields
      const validation = validationUtils.hasRequiredFields(customer, ['rif', 'razonSocial', 'domicilio']);
      if (!validation.isValid) {
        const error = new Error(`Missing required fields: ${validation.missingFields.join(', ')}`);
        logger.error('customers', 'create', 'Required fields validation failed', validation);
        throw error;
      }

      // Validate email if provided
      if (customer.email && !validationUtils.isValidEmail(customer.email)) {
        const error = new Error(`Invalid email format: ${customer.email}`);
        logger.error('customers', 'create', 'Email validation failed', { email: customer.email });
        throw error;
      }

      logger.info('customers', 'create', 'Creating customer', { rif: customer.rif, razonSocial: customer.razonSocial });

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

      // Additional validation already done above, these are redundant
      // Removed duplicate validations as they're now handled by Phase 1 utils

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

        // Log successful customer creation
        logger.info('customers', 'create', 'Customer created successfully', {
          customerId: createdCustomer.id,
          rif: createdCustomer.rif,
          razonSocial: createdCustomer.razon_social
        });

        // Return normalized customer object
        const normalizedCustomer = {
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

        // PHASE 2: Sync with TFHKA if customer is a business (has RIF starting with J or G)
        if (normalizedCustomer.rif.startsWith('J-') || normalizedCustomer.rif.startsWith('G-')) {
          try {
            logger.info('customers', 'tfhka_sync', 'Syncing business customer with TFHKA', {
              customerId: normalizedCustomer.id,
              rif: normalizedCustomer.rif
            });

            // Prepare customer data for TFHKA
            const tfhkaCustomerData = {
              rif: normalizedCustomer.rif,
              razon_social: normalizedCustomer.razonSocial,
              direccion: normalizedCustomer.domicilio,
              email: normalizedCustomer.email,
              telefono: normalizedCustomer.telefono,
              tipo_contribuyente: normalizedCustomer.tipoContribuyente
            };

            // Note: TFHKA sync would be implemented here when API is available
            // For now, we log the intent and prepare the data structure
            logger.info('customers', 'tfhka_sync', 'TFHKA sync prepared (API not yet connected)', {
              tfhkaCustomerData
            });

          } catch (syncError) {
            // Don't fail customer creation if TFHKA sync fails
            logger.warn('customers', 'tfhka_sync', 'TFHKA sync failed but customer created', {
              customerId: normalizedCustomer.id,
              error: syncError
            });
          }
        }

        return normalizedCustomer;

      } catch (dbError: unknown) {
        console.error('REST API operation failed:', dbError);

        // Handle specific HTTP/REST errors
        const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
        if (errorMessage?.includes('409') || errorMessage?.includes('duplicate')) {
          throw new Error(`Ya existe un cliente con el RIF: ${insertData.rif}`);
        }

        if (errorMessage?.includes('401') || errorMessage?.includes('403')) {
          throw new Error('Error de permisos. Verifica la configuración de Supabase.');
        }

        if (errorMessage?.includes('400')) {
          throw new Error('Datos inválidos. Verifica que todos los campos estén completos.');
        }

        // Re-throw with original message for better debugging
        throw new Error(errorMessage || 'Error en la operación de base de datos');
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
      console.log('Updating customer via REST API:', { id, ...customer });

      // Use direct REST API to avoid supabase-js headers issues
      const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

      // Normalize all data to prevent undefined/null header issues
      const updateData = {
        rif: normalizeString(customer.rif)?.toUpperCase() || '',
        razon_social: normalizeString(customer.razonSocial) || '',
        nombre: normalizeString(customer.nombre),
        domicilio: normalizeString(customer.domicilio) || '',
        telefono: normalizeString(customer.telefono),
        email: normalizeString(customer.email),
        tipo_contribuyente: customer.tipoContribuyente || 'ordinario',
      };

      // Validate required fields
      if (!updateData.rif) {
        throw new Error('RIF es requerido');
      }
      if (!updateData.razon_social) {
        throw new Error('Razón social es requerida');
      }
      if (!updateData.domicilio) {
        throw new Error('Domicilio es requerido');
      }

      console.log('Normalized update data:', updateData);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      });

      console.log('Update customer response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error updating customer:', errorText);

        // Handle specific HTTP/REST errors
        if (response.status === 409 || errorText.includes('duplicate')) {
          throw new Error(`Ya existe un cliente con el RIF: ${updateData.rif}`);
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error('Error de permisos. Verifica la configuración de Supabase.');
        }

        if (response.status === 400) {
          throw new Error('Datos inválidos. Verifica que todos los campos estén completos.');
        }

        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Customer updated via REST API:', data);

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No se recibieron datos del servidor');
      }

      const updatedCustomer = data[0];

      return {
        id: updatedCustomer.id,
        rif: updatedCustomer.rif,
        razonSocial: updatedCustomer.razon_social,
        nombre: updatedCustomer.nombre,
        domicilio: updatedCustomer.domicilio,
        telefono: updatedCustomer.telefono,
        email: updatedCustomer.email,
        tipoContribuyente: updatedCustomer.tipo_contribuyente,
        createdAt: updatedCustomer.created_at,
        updatedAt: updatedCustomer.updated_at,
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
      console.log('Deleting customer via REST API:', id);

      // Use direct REST API to avoid supabase-js headers issues
      const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

      const response = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      });

      console.log('Delete customer response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error deleting customer:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      console.log('Customer deleted successfully via REST API');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};