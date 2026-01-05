/**
 * CONSTANTES DE LAYOUT PARA PDF - CAJAS FIJAS
 * Basado en el PDF de referencia "GRU Corporacion Nautica de Servicios"
 * TODAS LAS MEDIDAS EN MM
 */

// MÁRGENES Y DIMENSIONES DE PÁGINA (A4 vertical)
export const PDF_LAYOUT = {
  // Márgenes de página
  MARGIN_LEFT: 12,
  MARGIN_RIGHT: 12,
  MARGIN_TOP: 10,
  ANCHO_UTIL: 186, // 210mm - 12mm*2
  PAGE_MARGIN: 12, // Para compatibilidad con código existente

  // ========================================
  // 1) CAJA LOGO (izquierda, fija)
  // ========================================
  LOGO_BOX: {
    x: 12,
    y: 10,
    w: 52,
    h: 52,
  },

  // ========================================
  // 2) CAJA EMPRESA (centro superior)
  // ========================================
  EMPRESA_BOX: {
    x: 65,
    y: 10,
    w: 88,
    h: 52,
    // Configuración de texto
    TITLE: {
      fontSize: 12.5,
      fallbackSize: 11.5,
      fontStyle: 'bold',
      maxLines: 1,
    },
    RIF: {
      fontSize: 10.5,
      fontStyle: 'bold',
      maxLines: 1,
    },
    ADDRESS: {
      fontSize: 8.2,
      fontStyle: 'normal',
      labelBold: true,
      maxLines: 2,
    },
    CODE: {
      fontSize: 9,
      fontStyle: 'normal',
      labelBold: true,
      maxLines: 1,
    },
  },

  // ========================================
  // 3) CAJA FACTURA (derecha superior, fija)
  // ========================================
  FACTURA_BOX: {
    x: 155,
    y: 10,
    w: 43,
    h: 52,
    border: 1,
    padding: 3,
    // Configuración de texto
    TITLE: {
      fontSize: 14,
      fontStyle: 'bold',
    },
    FIELDS: {
      fontSize: 7,
      fallbackSize: 6,
      labelStyle: 'normal',
      valueStyle: 'bold',
      lineHeight: 1.25, // Espacio ajustado para que quepa todo
    },
  },

  // ========================================
  // 4) LÍNEA SEPARADORA
  // ========================================
  SEPARATOR_LINE: {
    x: 12,
    y: 65,
    w: 186,
    thickness: 0.42, // 1.2pt en mm
  },

  // ========================================
  // 5) CAJA CLIENTE (debajo de la línea)
  // ========================================
  CLIENT_BOX: {
    x: 12,
    y: 70,
    w: 186,
    h: 28,
    BG_COLOR: [245, 245, 245],
    // Configuración de texto
    FIELDS: {
      labelSize: 9,
      valueSize: 9,
      labelStyle: 'bold',
      valueStyle: 'normal',
      lineHeight: 1.2,
    },
    // Reglas de truncamiento
    RAZON_SOCIAL_MAX_LINES: 1,
    DIRECCION_MAX_LINES: 2,
  },

  // ========================================
  // 6) TABLA DE PRODUCTOS - CORREGIDA
  // ========================================
  TABLE: {
    X: 12, // Inicia en el margen izquierdo
    START_Y: 100, // CLIENT_BOX termina en y:70 + h:28 = 98mm, dejamos 2mm de espacio
    WIDTH: 186, // Ancho total exacto
    HEADER_HEIGHT: 10,
    ROW_HEIGHT: 8,
    HEADER_BG: [41, 98, 160],
    HEADER_TEXT_COLOR: [255, 255, 255],
    HEADER_FONT_SIZE: 8,
    BODY_FONT_SIZE: 7,

    // COLUMNAS CORREGIDAS - SUMAN EXACTAMENTE 186mm
    // Verificación: 28+86+14+24+18+16 = 186 ✓
    COLUMNS: {
      CODIGO: { x: 12, width: 28 },       // 12 + 28 = 40
      DESCRIPCION: { x: 40, width: 86 },  // 40 + 86 = 126
      CANT: { x: 126, width: 14 },        // 126 + 14 = 140
      PRECIO_UNIT: { x: 140, width: 24 }, // 140 + 24 = 164
      ALICUOTA: { x: 164, width: 18 },    // 164 + 18 = 182
      TOTAL: { x: 182, width: 16 },       // 182 + 16 = 198 (12 + 186 = 198) ✓
    },
  },

  // MARCA DE AGUA
  WATERMARK: {
    SIZE: 200,
    OPACITY: 0.04,
    // X, Y se calculan para centrar
  },

  // BLOQUE DE TOTALES
  TOTALS: {
    START_Y: 0, // Se calcula dinámicamente después de la tabla
    TASA_BCV_Y_OFFSET: -10, // Antes de los totales

    // Columnas USD y BS (posiciones ajustadas según referencia)
    USD_COL_X: 80,
    BS_COL_X: 155,
    LABEL_X: 20,

    LINE_HEIGHT: 5, // Aumentado de 4 a 5 para más espacio vertical
    FONT_SIZE: 7,

    // Fila "Total a Pagar"
    TOTAL_PAGAR_HEIGHT: 6,
    TOTAL_PAGAR_BG: [41, 98, 160],
    TOTAL_PAGAR_TEXT: [255, 255, 255],
  },

  // PIE DE PÁGINA
  FOOTER: {
    LEGAL_TEXT_Y: 0, // Se calcula dinámicamente
    QR_SIZE: 40,
    QR_X: 10,
    FONT_SIZE: 6,
  },

  // FLAG DE DEBUG
  DEBUG_MODE: false, // Cambiar a true para activar debug visual
};

// COLORES
export const PDF_COLORS = {
  PRIMARY_BLUE: [41, 98, 160],
  DARK_BLUE: [27, 58, 97],
  RED: [200, 0, 0],
  BLACK: [0, 0, 0],
  WHITE: [255, 255, 255],
  LIGHT_GRAY: [245, 245, 245],
  GRAY: [100, 100, 100],
  // Colores para debug
  DEBUG_LOGO: [0, 0, 255],
  DEBUG_EMPRESA: [0, 255, 0],
  DEBUG_FACTURA: [255, 0, 0],
  DEBUG_CLIENT: [255, 165, 0],
  DEBUG_TABLE: [255, 0, 255],
};

// TIPOGRAFÍA
export const PDF_FONTS = {
  COMPANY_TITLE: { size: 8, style: 'bold' },
  COMPANY_RIF: { size: 6.5, style: 'normal' },
  COMPANY_ADDRESS: { size: 6, style: 'normal' },
  FACTURA_BOX: { size: 11, style: 'bold' },
  DOC_DATA: { size: 6.5, style: 'normal' },
  CLIENT_LABEL: { size: 7, style: 'bold' },
  CLIENT_VALUE: { size: 7, style: 'normal' },
  TABLE_HEADER: { size: 8, style: 'bold' },
  TABLE_BODY: { size: 7, style: 'normal' },
  TOTALS_LABEL: { size: 7, style: 'normal' },
  TOTALS_VALUE: { size: 7, style: 'normal' },
  TOTALS_TOTAL: { size: 8, style: 'bold' },
  FOOTER_LEGAL: { size: 6, style: 'normal' },
};

// FORMATEO DE NÚMEROS
export const formatBS = (value: number): string => {
  return value.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).replace(',', '_').replace(/\./g, ',').replace('_', '.');
};

export const formatUSD = (value: number): string => {
  return value.toFixed(2);
};
