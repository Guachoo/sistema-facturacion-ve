/**
 * Sistema Completo de Configuraciones
 * Tipos para todas las configuraciones del sistema
 */

// ==================== CONFIGURACIÓN DE EMPRESA ====================
export interface ControlNumberBatch {
  id: string;
  rangeFrom: number;
  rangeTo: number;
  active: boolean;
  used: number;
  remaining: number;
  fechaCreacion?: string;
  fechaActivacion?: string;
}

export interface CompanyConfig {
  // Datos básicos
  razonSocial: string;
  rif: string;
  domicilioFiscal: string;
  telefonos: string;
  email: string;
  website?: string;

  // Logos y branding
  logo?: string;
  logoSecundario?: string;
  coloresCorporativos: {
    primario: string;
    secundario: string;
    acento: string;
  };

  // Datos adicionales
  condicionesVenta: string;
  avisoLegal?: string;
  pie_factura?: string;
  horarioAtencion?: string;
  redesSociales?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };

  // Números de control
  numerosControl?: {
    lotes: ControlNumberBatch[];
    siguienteNumero: number;
    configuracionAutomatica: boolean;
  };
}

// ==================== CONFIGURACIÓN FISCAL ====================
export interface FiscalConfig {
  // Configuración SENIAT
  seniat: {
    contribuyenteEspecial: boolean;
    agenteretencionIVA: boolean;
    agenteRetencionISLR: boolean;
    certificadoDigital?: string;
    validezCertificado?: string;
  };

  // Configuración de documentos
  documentos: {
    numeracionAutomatica: boolean;
    prefijos: {
      facturas: string;
      notasCredito: string;
      notasDebito: string;
      cotizaciones: string;
    };
    formatoFecha: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    validacionAutomatica: boolean;
  };

  // Impuestos
  impuestos: {
    ivaGeneral: number; // 16%
    ivaReducido: number; // 8%
    igtfPorcentaje: number; // 3%
    aplicarIgtfDivisas: boolean;
    retencionIVA: number;
    retencionISLR: number;
  };

  // Configuración de backup fiscal
  backup: {
    automatico: boolean;
    frecuencia: 'diario' | 'semanal' | 'mensual';
    retencionMeses: number;
    encriptado: boolean;
  };
}

// ==================== CONFIGURACIÓN DE NOTIFICACIONES ====================
export interface NotificationConfig {
  // Email
  email: {
    habilitado: boolean;
    servidor: {
      smtp_host: string;
      smtp_port: number;
      smtp_usuario: string;
      smtp_password: string;
      ssl: boolean;
      tls: boolean;
    };
    plantillas: {
      facturaEmail: string;
      recordatorioPago: string;
      notaCreditoEmail: string;
      reporteDiario: string;
    };
    copiaOculta?: string;
    firmaEmail?: string;
  };

  // Notificaciones del sistema
  sistema: {
    alertasBajoStock: boolean;
    alertasVencimiento: boolean;
    alertasFiscales: boolean;
    alertasBackup: boolean;
    notificacionesEscritorio: boolean;
    sonidos: boolean;
  };

  // WhatsApp/SMS (futuro)
  whatsapp?: {
    habilitado: boolean;
    apiKey?: string;
    plantillas?: string[];
  };
}

// ==================== CONFIGURACIÓN DE SISTEMA ====================
export interface SystemConfig {
  // Apariencia
  apariencia: {
    tema: 'claro' | 'oscuro' | 'auto';
    idioma: 'es' | 'en';
    monedaPrincipal: 'VES' | 'USD';
    formatoNumeros: 'es-VE' | 'en-US';
    zonaHoraria: string;
  };

  // Performance
  rendimiento: {
    paginacionTablas: number;
    cacheDocumentos: boolean;
    compressionImagenes: boolean;
    timeoutRequests: number;
  };

  // Seguridad
  seguridad: {
    sesionTiempo: number; // minutos
    intentosLoginMax: number;
    bloqueoTiempo: number; // minutos
    passwordMinLength: number;
    require2FA: boolean;
    logActividad: boolean;
    encriptacionLocal: boolean;
  };

  // Integración
  integraciones: {
    bcv: {
      habilitado: boolean;
      frecuenciaActualizacion: number; // horas
      fuente: 'bcv.org.ve' | 'dolartoday' | 'manual';
      alertaCambioSignificativo: boolean;
    };
    seniat: {
      habilitado: boolean;
      urlServicio: string;
      timeoutMs: number;
      reintentos: number;
    };
    tfhka: {
      habilitado: boolean;
      urlServicio: string;
      credenciales?: {
        usuario: string;
        password: string;
      };
    };
  };
}

// ==================== CONFIGURACIÓN DE FACTURACIÓN ====================
export interface BillingConfig {
  // Configuración general
  general: {
    termsPago: string[];
    validezCotizacion: number; // días
    descuentoMaximo: number; // porcentaje
    permitirPreciosNegativos: boolean;
    redondeoDecimales: number;
  };

  // Numeración
  numeracion: {
    facturas: {
      serie: string;
      siguiente: number;
      formato: string; // FAC-{serie}-{numero}
    };
    cotizaciones: {
      serie: string;
      siguiente: number;
      formato: string;
    };
    notasCredito: {
      serie: string;
      siguiente: number;
      formato: string;
    };
    notasDebito: {
      serie: string;
      siguiente: number;
      formato: string;
    };
  };

  // Formas de pago
  formasPago: {
    transferencia: { habilitado: boolean; recargo: number };
    efectivo: { habilitado: boolean; recargo: number };
    tarjeta: { habilitado: boolean; recargo: number };
    cheque: { habilitado: boolean; recargo: number };
    zelle: { habilitado: boolean; recargo: number };
    paypal: { habilitado: boolean; recargo: number };
    binance: { habilitado: boolean; recargo: number };
  };

  // Validaciones
  validaciones: {
    stockMinimo: boolean;
    clienteVencido: boolean;
    limitCredito: boolean;
    documentosRequeridos: boolean;
  };
}

// ==================== CONFIGURACIÓN DE INVENTARIO ====================
export interface InventoryConfig {
  // Control de stock
  stock: {
    metodoValuacion: 'FIFO' | 'LIFO' | 'PROMEDIO';
    alertaStockMinimo: boolean;
    stockMinimoGlobal: number;
    permitirStockNegativo: boolean;
    actualizacionAutomatica: boolean;
  };

  // Categorías y códigos
  codificacion: {
    codigoAutomatico: boolean;
    formatoCodigo: string; // ITEM-{categoria}-{numero}
    longitudCodigo: number;
    usarCodigoBarras: boolean;
    formatoCodigoBarras: 'EAN13' | 'CODE128' | 'QR';
  };

  // Precios
  precios: {
    multicosto: boolean;
    multiprecio: boolean;
    margenMinimo: number;
    margenMaximo: number;
    actualizacionMasiva: boolean;
  };
}

// ==================== CONFIGURACIÓN DE REPORTES ====================
export interface ReportsConfig {
  // Configuración general
  general: {
    formatoDefault: 'PDF' | 'Excel' | 'CSV';
    logoEnReportes: boolean;
    pieReportes: string;
    numeracionPaginas: boolean;
    marcaAgua?: string;
  };

  // Programación automática
  automaticos: {
    ventasDiarias: { habilitado: boolean; hora: string; destinatarios: string[] };
    ventasSemanales: { habilitado: boolean; dia: string; hora: string; destinatarios: string[] };
    ventasMensuales: { habilitado: boolean; dia: number; hora: string; destinatarios: string[] };
    stockBajo: { habilitado: boolean; frecuencia: string; destinatarios: string[] };
    backup: { habilitado: boolean; frecuencia: string; destinatarios: string[] };
  };

  // Personalización
  personalizacion: {
    coloresTemas: string[];
    fuentePrincipal: string;
    tamañoFuente: number;
    espaciadoLineas: number;
  };
}

// ==================== CONFIGURACIÓN COMPLETA DEL SISTEMA ====================
export interface SystemSettings {
  empresa: CompanyConfig;
  fiscal: FiscalConfig;
  notificaciones: NotificationConfig;
  sistema: SystemConfig;
  facturacion: BillingConfig;
  inventario: InventoryConfig;
  reportes: ReportsConfig;

  // Metadata
  version: string;
  ultimaActualizacion: string;
  usuarioActualizacion: string;
}

// ==================== TIPOS PARA FORMULARIOS ====================
export interface SettingsForm {
  section: keyof SystemSettings;
  data: any;
  isValid: boolean;
  errors: Record<string, string>;
}

export interface SettingsValidation {
  field: string;
  rule: string;
  message: string;
  value: any;
}

// ==================== CONFIGURACIÓN POR DEFECTO ====================
export const DEFAULT_SETTINGS: SystemSettings = {
  empresa: {
    razonSocial: 'Mi Empresa C.A.',
    rif: 'J-12345678-9',
    domicilioFiscal: 'Av. Principal, Edificio Torre, Piso 5, Oficina 501, Caracas 1050, Venezuela',
    telefonos: '+58-212-1234567 / +58-414-9876543',
    email: 'facturacion@miempresa.com',
    website: 'https://www.miempresa.com',
    coloresCorporativos: {
      primario: '#B2BDCE', // Según instrucciones del usuario
      secundario: '#B8872A', // Según instrucciones del usuario
      acento: '#8B9CAA' // Color intermedio entre los dos
    },
    condicionesVenta: 'Pago de contado. Precios incluyen IVA. Válido por 30 días.',
    avisoLegal: 'Este documento cumple con la normativa fiscal venezolana vigente. SENIAT.',
    pie_factura: 'Gracias por su confianza. ¡Que tenga un excelente día!',
    horarioAtencion: 'Lunes a Viernes 8:00 AM - 5:00 PM',
    redesSociales: {
      facebook: 'https://facebook.com/miempresa',
      instagram: 'https://instagram.com/miempresa',
      twitter: 'https://twitter.com/miempresa'
    },
    numerosControl: {
      lotes: [
        {
          id: '1',
          rangeFrom: 2025001,
          rangeTo: 2025500,
          active: true,
          used: 127,
          remaining: 373,
          fechaCreacion: '2025-01-01',
          fechaActivacion: '2025-01-01'
        },
        {
          id: '2',
          rangeFrom: 2024501,
          rangeTo: 2025000,
          active: false,
          used: 500,
          remaining: 0,
          fechaCreacion: '2024-06-01',
          fechaActivacion: '2024-06-01'
        }
      ],
      siguienteNumero: 2025128,
      configuracionAutomatica: true
    }
  },
  fiscal: {
    seniat: {
      contribuyenteEspecial: false,
      agenteretencionIVA: true, // Activado para empresas venezuelas
      agenteRetencionISLR: false,
      certificadoDigital: '',
      validezCertificado: ''
    },
    documentos: {
      numeracionAutomatica: true,
      prefijos: {
        facturas: 'FAC',
        notasCredito: 'NC',
        notasDebito: 'ND',
        cotizaciones: 'COT'
      },
      formatoFecha: 'DD/MM/YYYY', // Formato venezolano estándar
      validacionAutomatica: true
    },
    impuestos: {
      ivaGeneral: 16, // IVA actual Venezuela
      ivaReducido: 8,
      igtfPorcentaje: 3, // IGTF Venezuela
      aplicarIgtfDivisas: true,
      retencionIVA: 75, // Porcentaje retención IVA
      retencionISLR: 100 // Porcentaje retención ISLR
    },
    backup: {
      automatico: true,
      frecuencia: 'diario',
      retencionMeses: 12, // Según normativa venezolana
      encriptado: true
    }
  },
  notificaciones: {
    email: {
      habilitado: false,
      servidor: {
        smtp_host: '',
        smtp_port: 587,
        smtp_usuario: '',
        smtp_password: '',
        ssl: false,
        tls: true
      },
      plantillas: {
        facturaEmail: 'Estimado cliente, adjuntamos su factura fiscal. Este documento cumple con la normativa SENIAT vigente. Gracias por su confianza.',
        recordatorioPago: 'Le recordamos que tiene facturas pendientes de pago. Por favor proceda con el pago para evitar inconvenientes.',
        notaCreditoEmail: 'Adjuntamos su nota de crédito fiscal. Este documento ha sido procesado según las normativas venezolanas.',
        reporteDiario: 'Resumen diario de ventas - Sistema de Facturación Venezolano. Adjunto encontrará el reporte detallado.'
      },
      copiaOculta: 'admin@miempresa.com',
      firmaEmail: 'Atentamente,\\nEquipo de Facturación\\nMi Empresa C.A.\\n\\n---\\nEste email fue generado automáticamente por nuestro sistema.'
    },
    sistema: {
      alertasBajoStock: true,
      alertasVencimiento: true,
      alertasFiscales: true,
      alertasBackup: true,
      notificacionesEscritorio: true,
      sonidos: true
    }
  },
  sistema: {
    apariencia: {
      tema: 'claro',
      idioma: 'es',
      monedaPrincipal: 'VES',
      formatoNumeros: 'es-VE',
      zonaHoraria: 'America/Caracas'
    },
    rendimiento: {
      paginacionTablas: 50,
      cacheDocumentos: true,
      compressionImagenes: true,
      timeoutRequests: 30000
    },
    seguridad: {
      sesionTiempo: 60,
      intentosLoginMax: 3,
      bloqueoTiempo: 15,
      passwordMinLength: 8,
      require2FA: false,
      logActividad: true,
      encriptacionLocal: false
    },
    integraciones: {
      bcv: {
        habilitado: true,
        frecuenciaActualizacion: 24,
        fuente: 'bcv.org.ve',
        alertaCambioSignificativo: true
      },
      seniat: {
        habilitado: true,
        urlServicio: 'https://api.seniat.gob.ve',
        timeoutMs: 30000,
        reintentos: 3
      },
      tfhka: {
        habilitado: false,
        urlServicio: 'https://tfhka.seniat.gob.ve'
      }
    }
  },
  facturacion: {
    general: {
      termsPago: ['Contado', '8 días', '15 días', '30 días'],
      validezCotizacion: 30,
      descuentoMaximo: 50,
      permitirPreciosNegativos: false,
      redondeoDecimales: 2
    },
    numeracion: {
      facturas: { serie: 'FAC', siguiente: 1, formato: '{serie}-{numero:6}' },
      cotizaciones: { serie: 'COT', siguiente: 1, formato: '{serie}-{numero:6}' },
      notasCredito: { serie: 'NC', siguiente: 1, formato: '{serie}-{numero:6}' },
      notasDebito: { serie: 'ND', siguiente: 1, formato: '{serie}-{numero:6}' }
    },
    formasPago: {
      transferencia: { habilitado: true, recargo: 0 },
      efectivo: { habilitado: true, recargo: 0 },
      tarjeta: { habilitado: true, recargo: 3 }, // Con IGTF
      cheque: { habilitado: true, recargo: 0 },
      zelle: { habilitado: true, recargo: 3 }, // Con IGTF
      paypal: { habilitado: true, recargo: 3 }, // Con IGTF
      binance: { habilitado: true, recargo: 3 } // Con IGTF para criptomonedas
    },
    validaciones: {
      stockMinimo: true,
      clienteVencido: false,
      limitCredito: false,
      documentosRequeridos: true
    }
  },
  inventario: {
    stock: {
      metodoValuacion: 'PROMEDIO',
      alertaStockMinimo: true,
      stockMinimoGlobal: 5,
      permitirStockNegativo: false,
      actualizacionAutomatica: true
    },
    codificacion: {
      codigoAutomatico: true,
      formatoCodigo: 'ITEM-{numero:6}',
      longitudCodigo: 10,
      usarCodigoBarras: false,
      formatoCodigoBarras: 'CODE128'
    },
    precios: {
      multicosto: false,
      multiprecio: true,
      margenMinimo: 10,
      margenMaximo: 500,
      actualizacionMasiva: true
    }
  },
  reportes: {
    general: {
      formatoDefault: 'PDF',
      logoEnReportes: true,
      pieReportes: 'Sistema de Facturación Venezolano - Cumple normativa SENIAT | Generado automáticamente',
      numeracionPaginas: true,
      marcaAgua: 'SISTEMA FISCAL VENEZUELA'
    },
    automaticos: {
      ventasDiarias: { habilitado: true, hora: '18:00', destinatarios: ['admin@miempresa.com'] },
      ventasSemanales: { habilitado: true, dia: 'Lunes', hora: '08:00', destinatarios: ['gerencia@miempresa.com'] },
      ventasMensuales: { habilitado: true, dia: 1, hora: '08:00', destinatarios: ['contabilidad@miempresa.com'] },
      stockBajo: { habilitado: true, frecuencia: 'semanal', destinatarios: ['inventario@miempresa.com'] },
      backup: { habilitado: true, frecuencia: 'diario', destinatarios: ['it@miempresa.com'] }
    },
    personalizacion: {
      coloresTemas: ['#B2BDCE', '#B8872A', '#8B9CAA', '#ef4444'],
      fuentePrincipal: 'Arial',
      tamañoFuente: 12,
      espaciadoLineas: 1.2
    }
  },
  version: '1.0.0',
  ultimaActualizacion: new Date().toISOString(),
  usuarioActualizacion: 'sistema'
};