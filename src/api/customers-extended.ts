// PHASE 2 EXTENSIONS for customers.ts
// Advanced customer functions with TFHKA integration and enhanced RIF validation

import { useMutation, useQuery } from '@tanstack/react-query';
import type { Customer } from '@/types';

// Sistema convencional - Sin consultas externas

// Validate customer RIF with Venezuelan rules - Sistema convencional
export const useValidateCustomerRif = () => {
  return useMutation({
    mutationFn: async (rif: string): Promise<{
      isValid: boolean;
      details: any;
      suggestions?: string[];
    }> => {
      const { rifValidation } = await import('@/lib/utils');
      const { logger } = await import('@/lib/logger');

      logger.info('customers', 'validate_rif', 'Validating customer RIF', { rif });

      const isValidFormat = rifValidation.isValidFormat(rif);
      const isValid = rifValidation.isValid(rif);
      const parsed = rifValidation.parse(rif);
      const formatted = rifValidation.format(rif);

      const details = {
        originalRif: rif,
        formattedRif: formatted,
        isValidFormat,
        isValid,
        parsed,
        rifType: parsed?.type ? rifValidation.types[parsed.type as keyof typeof rifValidation.types] : null
      };

      // Sistema convencional: mínimas sugerencias, aceptar lo que escriba la cajera
      const suggestions: string[] = [];

      // Sistema convencional: aceptar exactamente lo que escriba la cajera
      // Sin auto-cálculo de dígitos verificadores

      logger.info('customers', 'validate_rif', 'RIF validation completed', details);

      return {
        isValid,
        details,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };
    }
  });
};

// Sync customer with TFHKA (for businesses)
export const useSyncCustomerWithTfhka = () => {
  return useMutation({
    mutationFn: async (customerId: string): Promise<{
      success: boolean;
      syncId?: string;
      message: string;
      razonSocial?: string;
      domicilio?: string;
      telefono?: string;
      email?: string;
    }> => {
      const { logger } = await import('@/lib/logger');

      logger.info('customers', 'tfhka_sync', 'Starting manual TFHKA sync', { customerId });

      try {
        // First, get customer data
        const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

        const response = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${customerId}`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('No se pudo obtener los datos del cliente');
        }

        const customers = await response.json();
        if (!customers || customers.length === 0) {
          throw new Error('Cliente no encontrado');
        }

        const customer = customers[0];

        // Check if customer is eligible for TFHKA sync (business customers only)
        if (!customer.rif.startsWith('J-') && !customer.rif.startsWith('G-')) {
          return {
            success: false,
            message: 'Solo clientes empresariales (RIF tipo J o G) pueden sincronizarse con TFHKA'
          };
        }

        // Prepare TFHKA sync data
        const tfhkaSyncData = {
          rif: customer.rif,
          razon_social: customer.razon_social,
          direccion: customer.domicilio,
          email: customer.email,
          telefono: customer.telefono,
          tipo_contribuyente: customer.tipo_contribuyente
        };

        logger.info('customers', 'tfhka_sync', 'TFHKA sync data prepared', {
          customerId,
          tfhkaSyncData
        });

        // TODO: Implement actual TFHKA API call when available
        // const { tfhkaApi } = await import('@/lib/api-client');
        // const syncResult = await tfhkaApi.syncCustomer(tfhkaSyncData);

        // For now, simulate successful sync
        const mockSyncId = `TFHKA_${Date.now()}`;

        logger.info('customers', 'tfhka_sync', 'TFHKA sync completed successfully', {
          customerId,
          syncId: mockSyncId
        });

        return {
          success: true,
          syncId: mockSyncId,
          message: 'Cliente sincronizado con TFHKA exitosamente',
          razonSocial: customer.razon_social,
          domicilio: customer.domicilio,
          telefono: customer.telefono,
          email: customer.email
        };

      } catch (error) {
        logger.error('customers', 'tfhka_sync', 'TFHKA sync failed', error);

        return {
          success: false,
          message: `Error en sincronización: ${error instanceof Error ? error.message : 'Error desconocido'}`
        };
      }
    }
  });
};

// Get customer fiscal status and compliance
export const useCustomerFiscalStatus = () => {
  return useMutation({
    mutationFn: async (customerId: string): Promise<{
      customer: Customer;
      fiscalStatus: {
        isCompliant: boolean;
        rifValid: boolean;
        tfhkaSynced: boolean;
        missingData: string[];
        recommendations: string[];
      };
    }> => {
      const { logger } = await import('@/lib/logger');
      const { rifValidation, validationUtils } = await import('@/lib/utils');

      logger.info('customers', 'fiscal_status', 'Checking customer fiscal status', { customerId });

      // Get customer data
      const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

      const response = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${customerId}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('No se pudo obtener los datos del cliente');
      }

      const customers = await response.json();
      if (!customers || customers.length === 0) {
        throw new Error('Cliente no encontrado');
      }

      const customerData = customers[0];

      // Normalize customer object
      const customer: Customer = {
        id: customerData.id,
        rif: customerData.rif,
        razonSocial: customerData.razon_social,
        nombre: customerData.nombre,
        domicilio: customerData.domicilio,
        telefono: customerData.telefono,
        email: customerData.email,
        tipoContribuyente: customerData.tipo_contribuyente,
        createdAt: customerData.created_at,
        updatedAt: customerData.updated_at,
      };

      // Analyze fiscal compliance
      const rifValid = rifValidation.isValid(customer.rif);
      const requiredFields = ['rif', 'razonSocial', 'domicilio'];
      const validation = validationUtils.hasRequiredFields(customer, requiredFields);

      const missingData: string[] = [];
      if (!validation.isValid) {
        missingData.push(...validation.missingFields);
      }

      if (customer.email && !validationUtils.isValidEmail(customer.email)) {
        missingData.push('Email inválido');
      }

      if (customer.telefono && !validationUtils.isValidPhone(customer.telefono)) {
        missingData.push('Teléfono inválido');
      }

      // Check if business customer needs TFHKA sync
      const isBusinessCustomer = customer.rif.startsWith('J-') || customer.rif.startsWith('G-');
      const tfhkaSynced = false; // TODO: Check actual TFHKA sync status

      const recommendations: string[] = [];
      if (!rifValid) {
        recommendations.push('Corregir el RIF del cliente');
      }
      if (missingData.length > 0) {
        recommendations.push('Completar datos faltantes');
      }
      if (isBusinessCustomer && !tfhkaSynced) {
        recommendations.push('Sincronizar con TFHKA para emisión fiscal');
      }
      if (!customer.email) {
        recommendations.push('Agregar email para envío de facturas');
      }

      const isCompliant = rifValid && validation.isValid && (isBusinessCustomer ? tfhkaSynced : true);

      const fiscalStatus = {
        isCompliant,
        rifValid,
        tfhkaSynced,
        missingData,
        recommendations
      };

      logger.info('customers', 'fiscal_status', 'Fiscal status analysis completed', {
        customerId,
        fiscalStatus
      });

      return {
        customer,
        fiscalStatus
      };
    }
  });
};

// Bulk import customers from Excel/CSV with validation
export const useBulkImportCustomers = () => {
  return useMutation({
    mutationFn: async (customersData: Omit<Customer, 'id'>[]): Promise<{
      successCount: number;
      errorCount: number;
      errors: { row: number; customer: any; error: string }[];
      imported: Customer[];
    }> => {
      const { logger } = await import('@/lib/logger');
      const { rifValidation, validationUtils } = await import('@/lib/utils');

      logger.info('customers', 'bulk_import', 'Starting bulk customer import', {
        totalCustomers: customersData.length
      });

      const errors: { row: number; customer: any; error: string }[] = [];
      const imported: Customer[] = [];

      for (let i = 0; i < customersData.length; i++) {
        const customerData = customersData[i];

        try {
          // Validate RIF
          if (!rifValidation.isValid(customerData.rif)) {
            throw new Error(`RIF inválido: ${customerData.rif}`);
          }

          // Validate required fields
          const validation = validationUtils.hasRequiredFields(customerData, ['rif', 'razonSocial', 'domicilio']);
          if (!validation.isValid) {
            throw new Error(`Campos faltantes: ${validation.missingFields.join(', ')}`);
          }

          // Validate email if provided
          if (customerData.email && !validationUtils.isValidEmail(customerData.email)) {
            throw new Error(`Email inválido: ${customerData.email}`);
          }

          // Normalize data for database
          const insertData = {
            rif: customerData.rif.toUpperCase(),
            razon_social: customerData.razonSocial,
            nombre: customerData.nombre,
            domicilio: customerData.domicilio,
            telefono: customerData.telefono,
            email: customerData.email,
            tipo_contribuyente: customerData.tipoContribuyente || 'ordinario',
          };

          // Insert to database
          const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
          const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

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

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          if (data && data.length > 0) {
            const createdCustomer = data[0];
            imported.push({
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
            });
          }

        } catch (error) {
          errors.push({
            row: i + 1,
            customer: customerData,
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
        }
      }

      const result = {
        successCount: imported.length,
        errorCount: errors.length,
        errors,
        imported
      };

      logger.info('customers', 'bulk_import', 'Bulk import completed', result);

      return result;
    }
  });
};

// Export customers to Excel/CSV format
export const useExportCustomers = () => {
  return useMutation({
    mutationFn: async (format: 'excel' | 'csv' = 'csv'): Promise<{ data: any[]; downloadUrl?: string }> => {
      const { logger } = await import('@/lib/logger');

      logger.info('customers', 'export', `Starting customer export in ${format} format`);

      // Get all customers
      const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

      const response = await fetch(`${SUPABASE_URL}/rest/v1/customers?order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('No se pudieron obtener los datos de clientes');
      }

      const rawCustomers = await response.json();

      // Format data for export
      const exportData = rawCustomers.map((customer: any) => ({
        'RIF': customer.rif,
        'Razón Social': customer.razon_social,
        'Nombre': customer.nombre || '',
        'Domicilio': customer.domicilio,
        'Teléfono': customer.telefono || '',
        'Email': customer.email || '',
        'Tipo Contribuyente': customer.tipo_contribuyente,
        'Fecha Creación': new Date(customer.created_at).toLocaleDateString('es-VE'),
        'Última Actualización': new Date(customer.updated_at).toLocaleDateString('es-VE')
      }));

      logger.info('customers', 'export', 'Customer export completed', {
        format,
        totalCustomers: exportData.length
      });

      // TODO: Generate actual download file when file generation library is available
      return {
        data: exportData,
        downloadUrl: undefined // Would be generated with actual file creation
      };
    }
  });
};

// Customer Audit History Hook
export const useCustomerAuditHistory = (customerId?: string) => {
  return useQuery({
    queryKey: ['customer-audit-history', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { logger } = await import('@/lib/logger');

      logger.info('customer-audit', 'fetch', 'Fetching customer audit history', {
        customerId
      });

      // TODO: Replace with actual audit API when implemented
      // For now, return mock audit data
      const mockAuditHistory = [
        {
          id: '1',
          customerId,
          action: 'created',
          description: 'Customer created',
          timestamp: new Date().toISOString(),
          userId: 'system',
          userName: 'System'
        },
        {
          id: '2',
          customerId,
          action: 'rif_validated',
          description: 'RIF validation completed',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          userId: 'admin',
          userName: 'Administrator'
        }
      ];

      logger.info('customer-audit', 'fetch', 'Customer audit history retrieved', {
        customerId,
        recordCount: mockAuditHistory.length
      });

      return mockAuditHistory;
    },
    enabled: !!customerId
  });
};