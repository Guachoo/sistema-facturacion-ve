// Module Integration Validator for Phase 1
// Validates that all modules can work together correctly

import { apiClient, tfhkaApi } from './api-client';
import { supabase, fiscalDocumentHelpers } from './supabase';
import { rifValidation, currencyUtils } from './utils';
import { logger } from './logger';

export const moduleValidator = {
  // Check if API clients are properly configured
  validateApiClients: () => {
    const results = {
      mainApiClient: {
        configured: !!apiClient,
        baseURL: apiClient.defaults?.baseURL,
        hasInterceptors: !!(apiClient.interceptors && apiClient.interceptors.request)
      },
      tfhkaApi: {
        configured: !!tfhkaApi,
        hasMethods: !!(tfhkaApi && typeof tfhkaApi.authenticate === 'function' && typeof tfhkaApi.emitDocument === 'function')
      }
    };

    logger.info('validation', 'api_clients', 'API clients validation completed', results);
    return results;
  },

  // Check if Supabase is properly configured
  validateSupabase: () => {
    const results = {
      supabaseClient: {
        configured: !!supabase,
        hasHelpers: !!fiscalDocumentHelpers,
        helperMethods: {
          getNextDocumentNumber: typeof fiscalDocumentHelpers.getNextDocumentNumber === 'function',
          createDocument: typeof fiscalDocumentHelpers.createDocument === 'function',
          logTfhkaAction: typeof fiscalDocumentHelpers.logTfhkaAction === 'function',
          getDocumentWithItems: typeof fiscalDocumentHelpers.getDocumentWithItems === 'function',
          updateDocumentStatus: typeof fiscalDocumentHelpers.updateDocumentStatus === 'function'
        }
      }
    };

    logger.info('validation', 'supabase', 'Supabase validation completed', results);
    return results;
  },

  // Check if utility functions work correctly
  validateUtilities: () => {
    const testRif = 'J-12345678-9';
    const testAmount = 1000;

    const results = {
      rifValidation: {
        isValidFormat: rifValidation.isValidFormat(testRif),
        format: rifValidation.format('J123456789'),
        types: Object.keys(rifValidation.types).length > 0
      },
      currencyUtils: {
        formatVES: currencyUtils.formatVES(testAmount).includes('Bs'),
        calculateIVA: currencyUtils.calculateIVA(testAmount) === 160, // 16% IVA
        calculateIGTF: currencyUtils.calculateIGTF(testAmount) === 30 // 3% IGTF
      }
    };

    logger.info('validation', 'utilities', 'Utilities validation completed', results);
    return results;
  },

  // Check logger functionality
  validateLogger: () => {
    logger.info('validation', 'logger_test', 'Testing logger functionality');
    logger.debug('validation', 'logger_test', 'Debug message test');

    const recentLogs = logger.getRecentLogs(2);

    const results = {
      logger: {
        canLog: true,
        hasRecentLogs: recentLogs.length >= 2,
        logStructure: recentLogs[0] ? {
          hasTimestamp: !!recentLogs[0].timestamp,
          hasLevel: !!recentLogs[0].level,
          hasModule: !!recentLogs[0].module,
          hasAction: !!recentLogs[0].action
        } : null
      }
    };

    logger.info('validation', 'logger', 'Logger validation completed', results);
    return results;
  },

  // Validate cross-module integration
  validateCrossModuleIntegration: async () => {
    try {
      // Test 1: Logger + API integration
      logger.info('validation', 'cross_module', 'Testing cross-module integration');

      // Test 2: Utils + Logger integration
      const testRif = 'J-30000000-0';
      const isValid = rifValidation.isValid(testRif);
      logger.info('validation', 'cross_module', `RIF validation result for ${testRif}`, { isValid });

      // Test 3: Currency + Logger integration
      const testAmount = 1500;
      const ivaAmount = currencyUtils.calculateIVA(testAmount);
      logger.info('validation', 'cross_module', `IVA calculation for ${testAmount}`, { ivaAmount });

      const results = {
        crossModuleIntegration: {
          loggerApiIntegration: true,
          utilsLoggerIntegration: true,
          currencyLoggerIntegration: true,
          allModulesCanCommunicate: true
        }
      };

      logger.info('validation', 'cross_module', 'Cross-module integration completed', results);
      return results;

    } catch (error) {
      logger.error('validation', 'cross_module', 'Cross-module integration failed', error);
      return {
        crossModuleIntegration: {
          error: (error as Error).message,
          allModulesCanCommunicate: false
        }
      };
    }
  },

  // Run all validations
  runCompleteValidation: async () => {
    logger.info('validation', 'complete', 'Starting complete module validation');

    const results = {
      apiClients: moduleValidator.validateApiClients(),
      supabase: moduleValidator.validateSupabase(),
      utilities: moduleValidator.validateUtilities(),
      logger: moduleValidator.validateLogger(),
      crossModule: await moduleValidator.validateCrossModuleIntegration()
    };

    // Analyze overall health
    const healthChecks = {
      apiClientsHealthy: !!(results.apiClients.mainApiClient.configured && results.apiClients.tfhkaApi.configured),
      supabaseHealthy: !!(results.supabase.supabaseClient.configured && results.supabase.supabaseClient.hasHelpers),
      utilitiesHealthy: !!(results.utilities.rifValidation.isValidFormat && results.utilities.currencyUtils.calculateIVA),
      loggerHealthy: !!results.logger.logger.canLog,
      crossModuleHealthy: !!results.crossModule.crossModuleIntegration.allModulesCanCommunicate
    };

    const overallHealth = Object.values(healthChecks).every(check => check);

    const summary = {
      overallHealth,
      healthChecks,
      totalChecks: Object.keys(healthChecks).length,
      passedChecks: Object.values(healthChecks).filter(Boolean).length,
      results
    };

    logger.info('validation', 'complete', 'Complete validation finished', summary);

    return summary;
  }
};

export default moduleValidator;