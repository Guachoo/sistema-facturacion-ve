// =====================================================
// TFHKA REACT HOOKS - Integración con React Query
// =====================================================
// Hooks para facilitar el uso de TFHKA en componentes React

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tfhkaApi } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import type {
  AutenticacionRequest,
  AutenticacionResponse,
  EstadoDocumentoRequest,
  EstadoDocumentoResponse,
  TfhkaOperationResult,
  TipoAmbiente
} from '@/lib/tfhka-types';

// =====================================================
// AUTENTICACIÓN TFHKA
// =====================================================

export const useTfhkaAuthentication = () => {
  return useMutation({
    mutationFn: async (credentials: AutenticacionRequest): Promise<TfhkaOperationResult<AutenticacionResponse>> => {
      logger.info('tfhka-hooks', 'authenticate', 'Starting TFHKA authentication', {
        usuario: credentials.usuario,
        rif_emisor: credentials.rif_emisor,
        ambiente: credentials.ambiente
      });

      const result = await tfhkaApi.authenticate(credentials);

      if (result.exito) {
        logger.info('tfhka-hooks', 'authenticate', 'TFHKA authentication successful');
      } else {
        logger.error('tfhka-hooks', 'authenticate', 'TFHKA authentication failed', result.errores);
      }

      return result;
    },
    onSuccess: (data) => {
      if (data.exito) {
        logger.info('tfhka-hooks', 'authenticate', 'Authentication hook success callback executed');
      }
    },
    onError: (error) => {
      logger.error('tfhka-hooks', 'authenticate', 'Authentication hook error callback', error);
    }
  });
};

// =====================================================
// ENVÍO DE DOCUMENTOS FISCALES
// =====================================================

export const useTfhkaDocumentSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentData: any): Promise<TfhkaOperationResult<any>> => {
      logger.info('tfhka-hooks', 'submit_document', 'Submitting fiscal document', {
        tipo_documento: documentData.tipo_documento,
        serie: documentData.serie,
        numero_documento: documentData.numero_documento
      });

      const result = await tfhkaApi.emitDocument(documentData);

      if (result.exito) {
        logger.info('tfhka-hooks', 'submit_document', 'Document submission successful', {
          numero_control: result.datos?.numero_control
        });
      } else {
        logger.error('tfhka-hooks', 'submit_document', 'Document submission failed', result.errores);
      }

      return result;
    },
    onSuccess: (data, variables) => {
      if (data.exito) {
        // Invalidar consultas relacionadas para actualizar caché
        queryClient.invalidateQueries({ queryKey: ['tfhka-documents'] });
        queryClient.invalidateQueries({
          queryKey: ['tfhka-document-status', variables.serie, variables.numero_documento]
        });

        logger.info('tfhka-hooks', 'submit_document', 'Document submission hook success callback executed');
      }
    },
    onError: (error) => {
      logger.error('tfhka-hooks', 'submit_document', 'Document submission hook error callback', error);
    }
  });
};

// =====================================================
// CONSULTA DE ESTADO DE DOCUMENTOS
// =====================================================

export const useTfhkaDocumentStatus = (
  request: EstadoDocumentoRequest,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
  }
) => {
  return useQuery({
    queryKey: [
      'tfhka-document-status',
      request.numero_control,
      request.serie,
      request.numero_documento,
      request.rif_emisor
    ],
    queryFn: async (): Promise<TfhkaOperationResult<EstadoDocumentoResponse>> => {
      logger.info('tfhka-hooks', 'get_status', 'Querying document status', {
        numero_control: request.numero_control,
        serie: request.serie,
        numero_documento: request.numero_documento
      });

      const result = await tfhkaApi.getDocumentStatus(request);

      if (result.exito) {
        logger.info('tfhka-hooks', 'get_status', 'Status query successful', {
          documentos_encontrados: result.datos?.documentos?.length || 0
        });
      } else {
        logger.error('tfhka-hooks', 'get_status', 'Status query failed', result.errores);
      }

      return result;
    },
    enabled: options?.enabled ?? !!(request.numero_control || request.serie || request.numero_documento),
    refetchInterval: options?.refetchInterval ?? 30000, // Refetch every 30 seconds por defecto
    staleTime: options?.staleTime ?? 10000, // Considerar datos frescos por 10 segundos
    retry: (failureCount, error) => {
      // Retry hasta 3 veces, pero no si es error de autenticación
      if (failureCount >= 3) return false;

      const isAuthError = error && typeof error === 'object' &&
        'errores' in error &&
        Array.isArray(error.errores) &&
        error.errores.some((err: any) => err.codigo?.includes('AUTH'));

      return !isAuthError;
    }
  });
};

// =====================================================
// ANULACIÓN DE DOCUMENTOS
// =====================================================

export const useTfhkaDocumentVoid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (voidRequest: {
      numero_control: string;
      serie: string;
      numero_documento: string;
      motivo: string;
      rif_emisor: string;
    }): Promise<TfhkaOperationResult<any>> => {
      logger.info('tfhka-hooks', 'void_document', 'Voiding document', {
        numero_control: voidRequest.numero_control,
        motivo: voidRequest.motivo
      });

      const result = await tfhkaApi.voidDocument(voidRequest);

      if (result.exito) {
        logger.info('tfhka-hooks', 'void_document', 'Document void successful');
      } else {
        logger.error('tfhka-hooks', 'void_document', 'Document void failed', result.errores);
      }

      return result;
    },
    onSuccess: (data, variables) => {
      if (data.exito) {
        // Invalidar consultas relacionadas
        queryClient.invalidateQueries({ queryKey: ['tfhka-documents'] });
        queryClient.invalidateQueries({
          queryKey: ['tfhka-document-status', variables.numero_control]
        });

        logger.info('tfhka-hooks', 'void_document', 'Document void hook success callback executed');
      }
    },
    onError: (error) => {
      logger.error('tfhka-hooks', 'void_document', 'Document void hook error callback', error);
    }
  });
};

// =====================================================
// ESTADO DE AUTENTICACIÓN
// =====================================================

export const useTfhkaAuthStatus = () => {
  return useQuery({
    queryKey: ['tfhka-auth-status'],
    queryFn: async () => {
      logger.debug('tfhka-hooks', 'auth_status', 'Checking TFHKA authentication status');

      const authStatus = tfhkaApi.getAuthStatus();

      logger.debug('tfhka-hooks', 'auth_status', 'Auth status retrieved', {
        authenticated: authStatus.authenticated,
        timeRemaining: authStatus.timeRemaining
      });

      return authStatus;
    },
    refetchInterval: 60000, // Verificar cada minuto
    staleTime: 30000, // Considerar datos frescos por 30 segundos
  });
};

// =====================================================
// VERIFICACIÓN DE CONECTIVIDAD
// =====================================================

export const useTfhkaHealthCheck = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['tfhka-health'],
    queryFn: async (): Promise<TfhkaOperationResult<{ status: string; timestamp: string }>> => {
      logger.info('tfhka-hooks', 'health_check', 'Performing TFHKA health check');

      const result = await tfhkaApi.healthCheck();

      if (result.exito) {
        logger.info('tfhka-hooks', 'health_check', 'Health check successful', result.datos);
      } else {
        logger.warn('tfhka-hooks', 'health_check', 'Health check failed', result.errores);
      }

      return result;
    },
    enabled,
    refetchInterval: 5 * 60 * 1000, // Verificar cada 5 minutos
    staleTime: 2 * 60 * 1000, // Datos frescos por 2 minutos
    retry: 2
  });
};

// =====================================================
// HOOK COMBINADO PARA MANEJO COMPLETO DE DOCUMENTOS
// =====================================================

export const useTfhkaDocumentManager = () => {
  const authenticate = useTfhkaAuthentication();
  const submitDocument = useTfhkaDocumentSubmission();
  const voidDocument = useTfhkaDocumentVoid();
  const authStatus = useTfhkaAuthStatus();

  const processDocument = async (
    credentials: AutenticacionRequest,
    documentData: any
  ): Promise<{
    success: boolean;
    authResult?: TfhkaOperationResult<AutenticacionResponse>;
    submitResult?: TfhkaOperationResult<any>;
    error?: string;
  }> => {
    try {
      logger.info('tfhka-hooks', 'process_document', 'Starting complete document processing');

      // 1. Autenticar si no está autenticado
      if (!authStatus.data?.authenticated) {
        logger.info('tfhka-hooks', 'process_document', 'Authentication required, authenticating...');

        const authResult = await authenticate.mutateAsync(credentials);

        if (!authResult.exito) {
          return {
            success: false,
            authResult,
            error: 'Error de autenticación: ' + authResult.mensaje
          };
        }
      }

      // 2. Enviar documento
      logger.info('tfhka-hooks', 'process_document', 'Submitting document...');

      const submitResult = await submitDocument.mutateAsync(documentData);

      if (!submitResult.exito) {
        return {
          success: false,
          submitResult,
          error: 'Error al enviar documento: ' + submitResult.mensaje
        };
      }

      logger.info('tfhka-hooks', 'process_document', 'Document processing completed successfully');

      return {
        success: true,
        submitResult
      };

    } catch (error) {
      logger.error('tfhka-hooks', 'process_document', 'Document processing failed', error);

      return {
        success: false,
        error: `Error durante el procesamiento: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  };

  return {
    // Mutaciones individuales
    authenticate,
    submitDocument,
    voidDocument,

    // Estado
    authStatus,

    // Función de alto nivel
    processDocument,

    // Estados combinados
    isLoading: authenticate.isPending || submitDocument.isPending || voidDocument.isPending,
    isAuthenticated: authStatus.data?.authenticated || false,

    // Limpiar autenticación
    clearAuthentication: () => {
      tfhkaApi.clearAuthentication();
      // Invalidar consultas relacionadas
      const queryClient = useQueryClient();
      queryClient.invalidateQueries({ queryKey: ['tfhka-auth-status'] });
    }
  };
};

// =====================================================
// UTILIDADES DE CONFIGURACIÓN
// =====================================================

export const useTfhkaConfiguration = () => {
  const configureTfhka = (ambiente: TipoAmbiente, credentials: AutenticacionRequest) => {
    logger.info('tfhka-hooks', 'configure', 'Configuring TFHKA environment', {
      ambiente,
      usuario: credentials.usuario,
      rif_emisor: credentials.rif_emisor
    });

    // Almacenar configuración en localStorage para persistencia
    const config = {
      ambiente,
      usuario: credentials.usuario,
      rif_emisor: credentials.rif_emisor,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('tfhka_config', JSON.stringify(config));
  };

  const getTfhkaConfiguration = (): {
    ambiente?: TipoAmbiente;
    usuario?: string;
    rif_emisor?: string;
    timestamp?: string;
  } => {
    try {
      const config = localStorage.getItem('tfhka_config');
      return config ? JSON.parse(config) : {};
    } catch (error) {
      logger.error('tfhka-hooks', 'get_config', 'Error loading TFHKA configuration', error);
      return {};
    }
  };

  const clearTfhkaConfiguration = () => {
    localStorage.removeItem('tfhka_config');
    tfhkaApi.clearAuthentication();
  };

  return {
    configureTfhka,
    getTfhkaConfiguration,
    clearTfhkaConfiguration
  };
};