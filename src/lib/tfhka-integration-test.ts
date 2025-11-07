// =====================================================
// TFHKA INTEGRATION TEST - Pruebas Completas
// =====================================================
// Pruebas de integración para verificar la funcionalidad completa de TFHKA

import { logger } from './logger';
import { TfhkaClient } from './tfhka-client';
import { tfhkaApi } from './api-client';
import type {
  AutenticacionRequest,
  EstadoDocumentoRequest,
  TipoAmbiente,
  DocumentoEstado
} from './tfhka-types';

// =====================================================
// DATOS DE PRUEBA
// =====================================================

const TEST_CREDENTIALS: AutenticacionRequest = {
  usuario: 'usuario_prueba',
  clave: 'clave_prueba_123',
  rif_emisor: 'J-12345678-9',
  ambiente: 'pruebas',
  aplicacion: {
    nombre: 'Sistema Facturación VE',
    version: '1.0.0',
    fabricante: 'Empresa Demo C.A.'
  },
  timestamp: new Date().toISOString(),
  dispositivo: {
    ip: '192.168.1.100',
    identificador: 'DEV_001'
  }
};

const TEST_FISCAL_DOCUMENT = {
  documentoElectronico: {
    Encabezado: {
      IdentificacionDocumento: {
        TipoDocumento: "01",
        NumeroDocumento: "00000001",
        FechaEmision: "2024-11-05",
        HoraEmision: "14:30:00",
        Serie: "A",
        Sucursal: "001",
        TipoDeVenta: "1",
        Moneda: "VES"
      },
      Vendedor: {
        TipoIdentificacion: "J",
        NumeroIdentificacion: "123456789",
        RazonSocial: "EMPRESA DEMO C.A.",
        Direccion: "Caracas, Venezuela",
        Pais: "VE"
      },
      Comprador: {
        TipoIdentificacion: "J",
        NumeroIdentificacion: "987654321",
        RazonSocial: "CLIENTE EJEMPLO C.A.",
        Direccion: "Valencia, Venezuela",
        Pais: "VE"
      },
      Totales: {
        TotalGeneral: "116.00",
        MontoTotalExento: "0.00",
        MontoTotalGravado: "100.00",
        MontoTotalDescuento: "0.00",
        MontoTotalIVA: "16.00"
      }
    },
    DetallesItems: [
      {
        NumeroLinea: "1",
        CodigoProducto: "SERV-001",
        Descripcion: "Servicio de Consultoría",
        Cantidad: "1.00",
        UnidadMedida: "UND",
        PrecioUnitario: "100.00",
        PrecioUnitarioDescuento: "0.00",
        MontoLinea: "100.00",
        TipoIVA: "16",
        MontoIVA: "16.00"
      }
    ]
  }
};

// =====================================================
// SUITE DE PRUEBAS TFHKA
// =====================================================

export class TfhkaIntegrationTest {
  private client: TfhkaClient;
  private testResults: Array<{
    testName: string;
    success: boolean;
    message: string;
    duration: number;
    timestamp: string;
    details?: any;
  }> = [];

  constructor(ambiente: TipoAmbiente = 'pruebas') {
    this.client = new TfhkaClient(ambiente);
    logger.info('tfhka-test', 'init', 'TFHKA Integration Test initialized', { ambiente });
  }

  // =====================================================
  // EJECUTAR TODAS LAS PRUEBAS
  // =====================================================

  async runAllTests(): Promise<{
    summary: {
      total: number;
      passed: number;
      failed: number;
      successRate: number;
      totalDuration: number;
    };
    results: typeof this.testResults;
  }> {
    logger.info('tfhka-test', 'run_all', 'Starting complete TFHKA integration test suite');

    const startTime = Date.now();
    this.testResults = [];

    // Ejecutar pruebas en orden
    await this.testAuthentication();
    await this.testDocumentSubmission();
    await this.testDocumentStatusQuery();
    await this.testDocumentVoid();
    await this.testApiClientIntegration();
    await this.testErrorHandling();
    await this.testConnectivity();

    const totalDuration = Date.now() - startTime;
    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;

    const summary = {
      total: this.testResults.length,
      passed,
      failed,
      successRate: Math.round((passed / this.testResults.length) * 100),
      totalDuration
    };

    logger.info('tfhka-test', 'run_all', 'TFHKA integration test suite completed', summary);

    return {
      summary,
      results: this.testResults
    };
  }

  // =====================================================
  // PRUEBA 1: AUTENTICACIÓN
  // =====================================================

  private async testAuthentication(): Promise<void> {
    const testName = 'TFHKA Authentication';
    const startTime = Date.now();

    try {
      logger.info('tfhka-test', 'auth', 'Testing TFHKA authentication');

      const authResponse = await this.client.authenticate(TEST_CREDENTIALS);

      if (authResponse.success && authResponse.token) {
        this.addTestResult({
          testName,
          success: true,
          message: 'Authentication successful',
          duration: Date.now() - startTime,
          details: {
            token_received: !!authResponse.token,
            expira_en: authResponse.expira_en
          }
        });
      } else {
        this.addTestResult({
          testName,
          success: false,
          message: `Authentication failed: ${authResponse.mensaje}`,
          duration: Date.now() - startTime,
          details: authResponse
        });
      }
    } catch (error) {
      this.addTestResult({
        testName,
        success: false,
        message: `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        details: { error }
      });
    }
  }

  // =====================================================
  // PRUEBA 2: ENVÍO DE DOCUMENTOS
  // =====================================================

  private async testDocumentSubmission(): Promise<void> {
    const testName = 'Document Submission';
    const startTime = Date.now();

    try {
      logger.info('tfhka-test', 'submit', 'Testing document submission');

      // Asegurar autenticación
      if (!this.client.getAuthStatus().authenticated) {
        await this.client.authenticate(TEST_CREDENTIALS);
      }

      const submitResponse = await this.client.submitDocument({
        documento_electronico: TEST_FISCAL_DOCUMENT,
        token_autenticacion: this.client.getAuthStatus().authenticated ? 'test_token' : '',
        tipo_operacion: 'emision',
        serie: 'A',
        numero_documento: '00000001'
      });

      if (submitResponse.success) {
        this.addTestResult({
          testName,
          success: true,
          message: 'Document submission successful',
          duration: Date.now() - startTime,
          details: {
            numero_control: submitResponse.numero_control,
            estado: submitResponse.estado_documento,
            url_verificacion: submitResponse.url_verificacion
          }
        });
      } else {
        this.addTestResult({
          testName,
          success: false,
          message: `Document submission failed: ${submitResponse.mensaje}`,
          duration: Date.now() - startTime,
          details: submitResponse
        });
      }
    } catch (error) {
      this.addTestResult({
        testName,
        success: false,
        message: `Document submission error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        details: { error }
      });
    }
  }

  // =====================================================
  // PRUEBA 3: CONSULTA DE ESTADO
  // =====================================================

  private async testDocumentStatusQuery(): Promise<void> {
    const testName = 'Document Status Query';
    const startTime = Date.now();

    try {
      logger.info('tfhka-test', 'status', 'Testing document status query');

      const statusRequest: EstadoDocumentoRequest = {
        numero_control: '12345678-01',
        serie: 'A',
        numero_documento: '00000001',
        rif_emisor: 'J-12345678-9',
        token: 'test_token',
        timestamp: new Date().toISOString()
      };

      const statusResponse = await this.client.getDocumentStatus(statusRequest);

      if (statusResponse.success) {
        this.addTestResult({
          testName,
          success: true,
          message: 'Status query successful',
          duration: Date.now() - startTime,
          details: {
            documento_encontrado: !!statusResponse.documento,
            estado: statusResponse.documento?.estado
          }
        });
      } else {
        this.addTestResult({
          testName,
          success: false,
          message: `Status query failed: ${statusResponse.mensaje}`,
          duration: Date.now() - startTime,
          details: statusResponse
        });
      }
    } catch (error) {
      this.addTestResult({
        testName,
        success: false,
        message: `Status query error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        details: { error }
      });
    }
  }

  // =====================================================
  // PRUEBA 4: ANULACIÓN DE DOCUMENTOS
  // =====================================================

  private async testDocumentVoid(): Promise<void> {
    const testName = 'Document Void';
    const startTime = Date.now();

    try {
      logger.info('tfhka-test', 'void', 'Testing document void');

      const voidResponse = await tfhkaApi.voidDocument({
        numero_control: '12345678-01',
        serie: 'A',
        numero_documento: '00000001',
        motivo: 'Prueba de anulación automática',
        rif_emisor: 'J-12345678-9'
      });

      if (voidResponse.exito) {
        this.addTestResult({
          testName,
          success: true,
          message: 'Document void successful',
          duration: Date.now() - startTime,
          details: voidResponse.datos
        });
      } else {
        this.addTestResult({
          testName,
          success: false,
          message: `Document void failed: ${voidResponse.mensaje}`,
          duration: Date.now() - startTime,
          details: voidResponse
        });
      }
    } catch (error) {
      this.addTestResult({
        testName,
        success: false,
        message: `Document void error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        details: { error }
      });
    }
  }

  // =====================================================
  // PRUEBA 5: INTEGRACIÓN API CLIENT
  // =====================================================

  private async testApiClientIntegration(): Promise<void> {
    const testName = 'API Client Integration';
    const startTime = Date.now();

    try {
      logger.info('tfhka-test', 'api_client', 'Testing API client integration');

      // Probar autenticación a través de API client
      const authResult = await tfhkaApi.authenticate(TEST_CREDENTIALS);

      if (authResult.exito) {
        // Probar health check
        const healthResult = await tfhkaApi.healthCheck();

        this.addTestResult({
          testName,
          success: true,
          message: 'API Client integration successful',
          duration: Date.now() - startTime,
          details: {
            auth_success: authResult.exito,
            health_check: healthResult.exito,
            auth_data: authResult.datos
          }
        });
      } else {
        this.addTestResult({
          testName,
          success: false,
          message: `API Client integration failed: ${authResult.mensaje}`,
          duration: Date.now() - startTime,
          details: authResult
        });
      }
    } catch (error) {
      this.addTestResult({
        testName,
        success: false,
        message: `API Client error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        details: { error }
      });
    }
  }

  // =====================================================
  // PRUEBA 6: MANEJO DE ERRORES
  // =====================================================

  private async testErrorHandling(): Promise<void> {
    const testName = 'Error Handling';
    const startTime = Date.now();

    try {
      logger.info('tfhka-test', 'error_handling', 'Testing error handling');

      // Probar autenticación con credenciales inválidas
      const invalidCredentials: AutenticacionRequest = {
        ...TEST_CREDENTIALS,
        usuario: 'usuario_invalido',
        clave: 'clave_incorrecta'
      };

      const authResponse = await this.client.authenticate(invalidCredentials);

      // Debería fallar pero no lanzar excepción
      if (!authResponse.success && authResponse.codigo_error) {
        this.addTestResult({
          testName,
          success: true,
          message: 'Error handling works correctly',
          duration: Date.now() - startTime,
          details: {
            error_caught: true,
            error_code: authResponse.codigo_error,
            error_message: authResponse.mensaje
          }
        });
      } else {
        this.addTestResult({
          testName,
          success: false,
          message: 'Error handling failed - should have rejected invalid credentials',
          duration: Date.now() - startTime,
          details: authResponse
        });
      }
    } catch (error) {
      this.addTestResult({
        testName,
        success: false,
        message: `Error handling test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        details: { error }
      });
    }
  }

  // =====================================================
  // PRUEBA 7: CONECTIVIDAD
  // =====================================================

  private async testConnectivity(): Promise<void> {
    const testName = 'SENIAT Connectivity';
    const startTime = Date.now();

    try {
      logger.info('tfhka-test', 'connectivity', 'Testing SENIAT connectivity');

      const healthResult = await tfhkaApi.healthCheck();

      this.addTestResult({
        testName,
        success: healthResult.exito,
        message: healthResult.exito ? 'Connectivity test successful' : `Connectivity failed: ${healthResult.mensaje}`,
        duration: Date.now() - startTime,
        details: healthResult.datos
      });
    } catch (error) {
      this.addTestResult({
        testName,
        success: false,
        message: `Connectivity error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        details: { error }
      });
    }
  }

  // =====================================================
  // UTILIDADES
  // =====================================================

  private addTestResult(result: Omit<typeof this.testResults[0], 'timestamp'>): void {
    this.testResults.push({
      ...result,
      timestamp: new Date().toISOString()
    });

    const status = result.success ? '✅' : '❌';
    logger.info('tfhka-test', 'result', `${status} ${result.testName}: ${result.message}`);
  }

  // Método para generar reporte detallado
  generateDetailedReport(): string {
    const summary = {
      total: this.testResults.length,
      passed: this.testResults.filter(r => r.success).length,
      failed: this.testResults.filter(r => !r.success).length
    };

    let report = `
🔍 REPORTE DE PRUEBAS TFHKA - INTEGRACIÓN SENIAT
================================================

📊 RESUMEN:
- Total de pruebas: ${summary.total}
- Exitosas: ${summary.passed} ✅
- Fallidas: ${summary.failed} ❌
- Tasa de éxito: ${Math.round((summary.passed / summary.total) * 100)}%

📋 DETALLE DE PRUEBAS:
`;

    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      report += `
${index + 1}. ${status} ${result.testName}
   Resultado: ${result.message}
   Duración: ${result.duration}ms
   Timestamp: ${result.timestamp}
`;

      if (!result.success && result.details) {
        report += `   Detalles del error: ${JSON.stringify(result.details, null, 2)}\n`;
      }
    });

    return report;
  }
}

// =====================================================
// FUNCIÓN DE UTILIDAD PARA EJECUTAR PRUEBAS
// =====================================================

export async function runTfhkaIntegrationTests(ambiente: TipoAmbiente = 'pruebas') {
  logger.info('tfhka-test', 'main', 'Starting TFHKA integration tests', { ambiente });

  const testSuite = new TfhkaIntegrationTest(ambiente);
  const results = await testSuite.runAllTests();

  console.log('\n' + testSuite.generateDetailedReport());

  return results;
}

// Exportar para uso en tests automatizados
export default TfhkaIntegrationTest;