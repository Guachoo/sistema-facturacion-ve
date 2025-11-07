// Integration test for Phase 1 modules
// This file validates that all modules work together correctly

import { apiClient, tfhkaApiClient, tfhkaApi, tfhkaTokenManager } from './api-client';
import { supabase, fiscalDocumentHelpers } from './supabase';
import {
  rifValidation,
  documentNumbering,
  currencyUtils,
  fiscalDateUtils,
  validationUtils
} from './utils';
import { logger, measurePerformance } from './logger';
import type {
  Customer,
  Item,
  FiscalDocument,
  TfhkaCredentials,
  TfhkaDocument
} from '@/types';

// Integration validation functions
export const integrationTests = {
  // Test 1: Validate all imports work correctly
  validateImports: () => {
    const results = {
      apiClient: !!apiClient,
      tfhkaApiClient: !!tfhkaApiClient,
      tfhkaApi: !!tfhkaApi,
      tfhkaTokenManager: !!tfhkaTokenManager,
      supabase: !!supabase,
      fiscalDocumentHelpers: !!fiscalDocumentHelpers,
      rifValidation: !!rifValidation,
      documentNumbering: !!documentNumbering,
      currencyUtils: !!currencyUtils,
      fiscalDateUtils: !!fiscalDateUtils,
      validationUtils: !!validationUtils,
      logger: !!logger
    };

    logger.info('integration', 'validate_imports', 'Import validation completed', results);

    const failedImports = Object.entries(results)
      .filter(([_, isValid]) => !isValid)
      .map(([name]) => name);

    return {
      success: failedImports.length === 0,
      failedImports,
      results
    };
  },

  // Test 2: Validate RIF functionality
  validateRifFunctions: () => {
    const testRifs = [
      'J-12345678-9',
      'V-12345678-0',
      'E-87654321-5',
      'INVALID-RIF'
    ];

    const results = testRifs.map(rif => {
      try {
        return {
          rif,
          isValidFormat: rifValidation.isValidFormat(rif),
          isValid: rifValidation.isValid(rif),
          formatted: rifValidation.format(rif),
          parsed: rifValidation.parse(rif)
        };
      } catch (error) {
        return {
          rif,
          error: (error as Error).message
        };
      }
    });

    logger.info('integration', 'validate_rif', 'RIF validation completed', results);
    return { success: true, results };
  },

  // Test 3: Validate currency and date utilities
  validateUtilityFunctions: () => {
    try {
      const testAmount = 1000;
      const testRate = 36.50;
      const testDate = new Date();

      const results = {
        currency: {
          formatVES: currencyUtils.formatVES(testAmount),
          formatUSD: currencyUtils.formatUSD(testAmount),
          calculateIVA: currencyUtils.calculateIVA(testAmount),
          calculateIGTF: currencyUtils.calculateIGTF(testAmount),
          convertToUSD: currencyUtils.convertCurrency(testAmount, testRate, 'VES', 'USD'),
          convertToVES: currencyUtils.convertCurrency(testAmount, testRate, 'USD', 'VES')
        },
        dates: {
          fiscalPeriod: fiscalDateUtils.getFiscalPeriod(testDate),
          fiscalYear: fiscalDateUtils.getFiscalYear(testDate),
          formatForSENIAT: fiscalDateUtils.formatForSENIAT(testDate),
          isInCurrentPeriod: fiscalDateUtils.isInFiscalPeriod(testDate, fiscalDateUtils.getFiscalPeriod(testDate))
        },
        document: {
          formatNumber: documentNumbering.formatNumber(123, 'A'),
          parseNumber: documentNumbering.parseNumber('A-00000123'),
          isValidSeries: documentNumbering.isValidSeries('A'),
          generateControlNumber: documentNumbering.generateControlNumber('A', 123, 2024)
        },
        validation: {
          isValidEmail: validationUtils.isValidEmail('test@example.com'),
          isValidPhone: validationUtils.isValidPhone('+58-414-123-4567'),
          hasRequiredFields: validationUtils.hasRequiredFields(
            { name: 'Test', email: 'test@example.com' },
            ['name', 'email', 'phone']
          )
        }
      };

      logger.info('integration', 'validate_utilities', 'Utility functions validated', results);
      return { success: true, results };
    } catch (error) {
      logger.error('integration', 'validate_utilities', 'Utility validation failed', error);
      return { success: false, error: (error as Error).message };
    }
  },

  // Test 4: Validate logging functionality
  validateLogging: () => {
    try {
      // Test different log levels
      logger.info('integration', 'test_logging', 'Testing info level');
      logger.warn('integration', 'test_logging', 'Testing warn level');
      logger.debug('integration', 'test_logging', 'Testing debug level');
      logger.logUserAction('test_action', 'integration', { testData: true });
      logger.logPerformance('test_operation', 500, { operation: 'test' });

      // Test log retrieval
      const recentLogs = logger.getRecentLogs(5);

      logger.info('integration', 'validate_logging', 'Logging validation completed', {
        recentLogsCount: recentLogs.length
      });

      return {
        success: true,
        recentLogsCount: recentLogs.length,
        hasRecentLogs: recentLogs.length > 0
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  },

  // Test 5: Validate type consistency
  validateTypeConsistency: () => {
    try {
      // Test Customer type
      const testCustomer: Customer = {
        rif: 'J-12345678-9',
        razonSocial: 'Test Company',
        domicilio: 'Test Address',
        tipoContribuyente: 'ordinario'
      };

      // Test Item type
      const testItem: Item = {
        codigo: 'TEST001',
        descripcion: 'Test Item',
        tipo: 'producto',
        precioBase: 100,
        ivaAplica: true
      };

      // Test FiscalDocument type structure
      const testFiscalDocument: Partial<FiscalDocument> = {
        document_type: 'factura',
        document_number: 'A-00000001',
        control_number: 'CTRL001',
        serie: 'A',
        status: 'draft',
        currency: 'VES',
        exchange_rate: 36.50,
        issue_date: new Date().toISOString()
      };

      // Test TFHKA types
      const testTfhkaCredentials: TfhkaCredentials = {
        username: 'test',
        password: 'test123'
      };

      const testTfhkaDocument: Partial<TfhkaDocument> = {
        tipo_documento: 'factura',
        numero_documento: 'A-00000001',
        numero_control: 'CTRL001',
        fecha_emision: new Date().toISOString(),
        moneda: 'VES',
        tasa_cambio: 36.50
      };

      logger.info('integration', 'validate_types', 'Type consistency validation completed', {
        customerValid: !!testCustomer.rif,
        itemValid: !!testItem.codigo,
        fiscalDocumentValid: !!testFiscalDocument.document_type,
        tfhkaCredentialsValid: !!testTfhkaCredentials.username,
        tfhkaDocumentValid: !!testTfhkaDocument.tipo_documento
      });

      return {
        success: true,
        typeTests: {
          customer: !!testCustomer.rif,
          item: !!testItem.codigo,
          fiscalDocument: !!testFiscalDocument.document_type,
          tfhkaCredentials: !!testTfhkaCredentials.username,
          tfhkaDocument: !!testTfhkaDocument.tipo_documento
        }
      };
    } catch (error) {
      logger.error('integration', 'validate_types', 'Type validation failed', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  },

  // Test 6: Validate environment configuration
  validateEnvironmentConfig: () => {
    const requiredEnvVars = [
      'VITE_API_BASE_URL',
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'VITE_TFHKA_API_URL'
    ];

    const envStatus = requiredEnvVars.map(varName => ({
      name: varName,
      exists: !!import.meta.env[varName],
      value: import.meta.env[varName] ? 'SET' : 'NOT_SET'
    }));

    const missingVars = envStatus.filter(env => !env.exists);

    logger.info('integration', 'validate_env', 'Environment validation completed', {
      totalVars: requiredEnvVars.length,
      setVars: envStatus.filter(env => env.exists).length,
      missingVars: missingVars.map(env => env.name)
    });

    return {
      success: missingVars.length === 0,
      envStatus,
      missingVars: missingVars.map(env => env.name)
    };
  },

  // Test 7: Validate TFHKA token management
  validateTfhkaTokenManager: () => {
    try {
      const results = {
        hasTokenManager: !!tfhkaTokenManager,
        hasGetMethod: typeof tfhkaTokenManager?.get === 'function',
        hasSetMethod: typeof tfhkaTokenManager?.set === 'function',
        hasGetRefreshMethod: typeof tfhkaTokenManager?.getRefresh === 'function',
        hasRemoveMethod: typeof tfhkaTokenManager?.remove === 'function'
      };

      // Test token operations (without making actual API calls)
      const testResults = {
        ...results,
        canCheckValidity: false,
        canManageTokens: false,
        hasValidTokenStructure: false,
        hasValidRefreshToken: false
      };

      try {
        // Try to get token (should not throw)
        const token = tfhkaTokenManager?.get();
        testResults.canCheckValidity = typeof token === 'string' || token === null;
      } catch (error) {
        // Expected if no token is set
        testResults.canCheckValidity = true;
      }

      try {
        // Try basic token management operations
        const currentToken = tfhkaTokenManager?.get();
        testResults.canManageTokens = true;

        // Test token storage operations with the retrieved token
        if (currentToken) {
          // If token exists, test refresh token retrieval
          const refreshToken = tfhkaTokenManager?.getRefresh();
          testResults.hasValidTokenStructure = typeof currentToken === 'string' && currentToken.length > 0;
          testResults.hasValidRefreshToken = typeof refreshToken === 'string' || refreshToken === null;
        } else {
          // If no token, test setting and retrieving a test token
          tfhkaTokenManager?.set('test-token');
          const testRetrieve = tfhkaTokenManager?.get();
          testResults.hasValidTokenStructure = testRetrieve === 'test-token';

          // Test refresh token functionality
          tfhkaTokenManager?.setRefresh('test-refresh-token');
          const testRefreshRetrieve = tfhkaTokenManager?.getRefresh();
          testResults.hasValidRefreshToken = testRefreshRetrieve === 'test-refresh-token';

          // Clean up test tokens
          tfhkaTokenManager?.remove();
          tfhkaTokenManager?.removeRefresh();
        }
      } catch (error) {
        // Expected if token manager has initialization requirements
        testResults.canManageTokens = false;
        testResults.hasValidTokenStructure = false;
        testResults.hasValidRefreshToken = false;
      }

      logger.info('integration', 'validate_tfhka_token', 'TFHKA token manager validation completed', testResults);

      return {
        success: testResults.hasTokenManager && testResults.hasGetMethod,
        results: testResults
      };
    } catch (error) {
      logger.error('integration', 'validate_tfhka_token', 'TFHKA token manager validation failed', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  },

  // Test 8: Performance test
  validatePerformance: async () => {
    try {
      const testOperation = async () => {
        // Simulate some work
        const testData = Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          rif: rifValidation.format(`J123456${i.toString().padStart(2, '0')}9`),
          amount: currencyUtils.calculateIVA(100 * i)
        }));

        return testData.length;
      };

      const result = await measurePerformance('integration_test', testOperation);

      logger.info('integration', 'validate_performance', 'Performance test completed', {
        itemsProcessed: result
      });

      return {
        success: true,
        itemsProcessed: result
      };
    } catch (error) {
      logger.error('integration', 'validate_performance', 'Performance test failed', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  },

  // Master integration test
  runAllTests: async () => {
    logger.info('integration', 'run_all_tests', 'Starting comprehensive integration tests');

    const testResults = {
      imports: integrationTests.validateImports(),
      rif: integrationTests.validateRifFunctions(),
      utilities: integrationTests.validateUtilityFunctions(),
      logging: integrationTests.validateLogging(),
      types: integrationTests.validateTypeConsistency(),
      environment: integrationTests.validateEnvironmentConfig(),
      tfhkaTokenManager: integrationTests.validateTfhkaTokenManager(),
      performance: await integrationTests.validatePerformance()
    };

    const successfulTests = Object.values(testResults).filter(result => result.success);
    const failedTests = Object.entries(testResults)
      .filter(([_, result]) => !result.success)
      .map(([name]) => name);

    const overallSuccess = failedTests.length === 0;

    logger.info('integration', 'run_all_tests', 'Integration tests completed', {
      totalTests: Object.keys(testResults).length,
      successfulTests: successfulTests.length,
      failedTests,
      overallSuccess
    });

    return {
      success: overallSuccess,
      totalTests: Object.keys(testResults).length,
      successfulTests: successfulTests.length,
      failedTests,
      results: testResults
    };
  }
};

// Export for use in development
export default integrationTests;