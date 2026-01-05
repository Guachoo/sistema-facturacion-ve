-- =====================================================
-- MIGRACIÓN: Sistema de Facturación Electrónica
-- =====================================================
-- Esta migración crea las tablas necesarias para el
-- sistema de facturación electrónica venezolana con
-- soporte para IVA, IGTF y conversión USD/VES

-- Tabla principal de facturas electrónicas
CREATE TABLE IF NOT EXISTS facturas_electronicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación del documento
  tipo_documento VARCHAR(2) NOT NULL DEFAULT '01', -- 01=Factura, 02=Nota Débito, 03=Nota Crédito
  numero_documento VARCHAR(50) NOT NULL UNIQUE,
  serie VARCHAR(20) NOT NULL,
  sucursal VARCHAR(20) NOT NULL,

  -- Fechas
  fecha_emision TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_vencimiento TIMESTAMP WITH TIME ZONE,
  hora_emision TIME NOT NULL,

  -- Cliente (comprador)
  cliente_id UUID REFERENCES customers(id),
  cliente_tipo_id VARCHAR(1) NOT NULL, -- V, J, E, P, G
  cliente_numero_id VARCHAR(20) NOT NULL,
  cliente_razon_social VARCHAR(255) NOT NULL,
  cliente_direccion TEXT,
  cliente_telefono VARCHAR(50),
  cliente_correo VARCHAR(100),

  -- Vendedor
  vendedor_codigo VARCHAR(20),
  vendedor_nombre VARCHAR(255),
  num_cajero VARCHAR(20),

  -- Tipo de operación
  tipo_proveedor VARCHAR(20),
  tipo_transaccion VARCHAR(20),
  tipo_de_pago VARCHAR(20) NOT NULL,
  tipo_de_venta VARCHAR(20) NOT NULL,
  moneda VARCHAR(3) NOT NULL DEFAULT 'VES',

  -- Totales en VES
  nro_items INTEGER NOT NULL DEFAULT 0,
  monto_gravado_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  monto_exento_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_descuento DECIMAL(15,2) DEFAULT 0,
  subtotal_antes_descuento DECIMAL(15,2) DEFAULT 0,
  total_iva DECIMAL(15,2) NOT NULL DEFAULT 0,
  monto_total_con_iva DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_a_pagar DECIMAL(15,2) NOT NULL DEFAULT 0,
  monto_en_letras TEXT,

  -- Totales en USD
  moneda_secundaria VARCHAR(3) DEFAULT 'USD',
  tipo_cambio DECIMAL(10,4),
  monto_gravado_total_usd DECIMAL(15,2),
  monto_exento_total_usd DECIMAL(15,2),
  subtotal_usd DECIMAL(15,2),
  total_descuento_usd DECIMAL(15,2),
  total_iva_usd DECIMAL(15,2),
  monto_total_con_iva_usd DECIMAL(15,2),
  total_a_pagar_usd DECIMAL(15,2),
  monto_en_letras_usd TEXT,

  -- IGTF
  base_igtf DECIMAL(15,2) DEFAULT 0,
  alicuota_igtf DECIMAL(5,2) DEFAULT 3.00,
  monto_igtf DECIMAL(15,2) DEFAULT 0,
  base_igtf_usd DECIMAL(15,2) DEFAULT 0,
  monto_igtf_usd DECIMAL(15,2) DEFAULT 0,

  -- Estado
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador', -- borrador, emitida, anulada, pagada
  anulado BOOLEAN DEFAULT FALSE,
  motivo_anulacion TEXT,

  -- Factura afectada (para notas de crédito/débito)
  serie_factura_afectada VARCHAR(20),
  numero_factura_afectada VARCHAR(50),
  fecha_factura_afectada DATE,
  monto_factura_afectada DECIMAL(15,2),
  comentario_factura_afectada TEXT,

  -- Orden relacionada
  numero_orden VARCHAR(50),

  -- Datos JSON completos (para respaldo)
  documento_json JSONB,

  -- Auditoría
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de items/líneas de factura
CREATE TABLE IF NOT EXISTS facturas_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas_electronicas(id) ON DELETE CASCADE,

  numero_linea INTEGER NOT NULL,

  -- Producto/Servicio
  item_id UUID REFERENCES items(id),
  codigo_plu VARCHAR(50),
  indicador_bien_servicio VARCHAR(1) NOT NULL, -- 1=Bien, 2=Servicio
  descripcion TEXT NOT NULL,
  codigo_ciiu VARCHAR(20),

  -- Cantidades y precios
  cantidad DECIMAL(10,3) NOT NULL,
  unidad_medida VARCHAR(20) NOT NULL,
  precio_unitario DECIMAL(15,4) NOT NULL,

  -- Descuentos y bonificaciones
  precio_unitario_descuento DECIMAL(15,4),
  descuento_monto DECIMAL(15,2) DEFAULT 0,
  monto_bonificacion DECIMAL(15,2) DEFAULT 0,
  descrip_bonificacion TEXT,
  recargo_monto DECIMAL(15,2) DEFAULT 0,

  -- Precio final
  precio_item DECIMAL(15,2) NOT NULL,

  -- Impuestos
  codigo_impuesto VARCHAR(10),
  tasa_iva DECIMAL(5,2) NOT NULL,
  valor_iva DECIMAL(15,2) NOT NULL,
  valor_total_item DECIMAL(15,2) NOT NULL,

  -- Información adicional
  info_adicional_item JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de formas de pago
CREATE TABLE IF NOT EXISTS facturas_formas_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas_electronicas(id) ON DELETE CASCADE,

  descripcion VARCHAR(255) NOT NULL,
  forma VARCHAR(20) NOT NULL, -- Código del catálogo
  fecha DATE NOT NULL,
  monto DECIMAL(15,2) NOT NULL,
  moneda VARCHAR(3) NOT NULL,
  tipo_cambio DECIMAL(10,4),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de descuentos/bonificaciones a nivel de factura
CREATE TABLE IF NOT EXISTS facturas_descuentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas_electronicas(id) ON DELETE CASCADE,

  descripcion TEXT NOT NULL,
  monto DECIMAL(15,2) NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de impuestos subtotales
CREATE TABLE IF NOT EXISTS facturas_impuestos_subtotal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas_electronicas(id) ON DELETE CASCADE,

  codigo_impuesto VARCHAR(10) NOT NULL, -- "G" (IVA), "IGTF", etc.
  alicuota DECIMAL(5,2) NOT NULL,
  base_imponible DECIMAL(15,2) NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  moneda VARCHAR(3) NOT NULL DEFAULT 'VES',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_facturas_numero_documento ON facturas_electronicas(numero_documento);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente_id ON facturas_electronicas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha_emision ON facturas_electronicas(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas_electronicas(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_serie ON facturas_electronicas(serie);
CREATE INDEX IF NOT EXISTS idx_facturas_tipo_documento ON facturas_electronicas(tipo_documento);

CREATE INDEX IF NOT EXISTS idx_facturas_items_factura_id ON facturas_items(factura_id);
CREATE INDEX IF NOT EXISTS idx_facturas_items_item_id ON facturas_items(item_id);

CREATE INDEX IF NOT EXISTS idx_facturas_formas_pago_factura_id ON facturas_formas_pago(factura_id);
CREATE INDEX IF NOT EXISTS idx_facturas_descuentos_factura_id ON facturas_descuentos(factura_id);
CREATE INDEX IF NOT EXISTS idx_facturas_impuestos_factura_id ON facturas_impuestos_subtotal(factura_id);

-- Comentarios para documentación
COMMENT ON TABLE facturas_electronicas IS 'Facturas electrónicas del sistema de facturación venezolana';
COMMENT ON TABLE facturas_items IS 'Líneas de detalle (items) de las facturas';
COMMENT ON TABLE facturas_formas_pago IS 'Formas de pago utilizadas en cada factura';
COMMENT ON TABLE facturas_descuentos IS 'Descuentos y bonificaciones aplicados a nivel de factura';
COMMENT ON TABLE facturas_impuestos_subtotal IS 'Desglose de impuestos (IVA, IGTF, etc.) por factura';

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_facturas_electronicas_updated_at BEFORE UPDATE ON facturas_electronicas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facturas_items_updated_at BEFORE UPDATE ON facturas_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
