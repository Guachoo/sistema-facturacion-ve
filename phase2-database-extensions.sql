-- =====================================================
-- PHASE 2 DATABASE EXTENSIONS - SISTEMA FACTURACIÓN VENEZOLANO
-- =====================================================
-- Nuevas tablas necesarias para funcionalidades Phase 2:
-- - SENIAT Codes & Fiscal Categories
-- - TFHKA Integration & Audit
-- - BCV Rates Management
-- - Enhanced Customer/Item Data
-- =====================================================

-- =====================================================
-- TABLA: SENIAT_CODES (Códigos SENIAT)
-- =====================================================
CREATE TABLE IF NOT EXISTS seniat_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20) NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('bien', 'servicio', 'importado', 'exento')),
  alicuota_iva_default DECIMAL(5,2) DEFAULT 16.00,
  requiere_codigo_arancelario BOOLEAN DEFAULT false,
  requiere_codigo_actividad BOOLEAN DEFAULT false,
  requiere_justificacion BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: BCV_RATES (Tasas BCV)
-- =====================================================
CREATE TABLE IF NOT EXISTS bcv_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL UNIQUE,
  tasa_usd DECIMAL(10,4) NOT NULL,
  tasa_eur DECIMAL(10,4),

  -- Metadatos de sellado
  sellado BOOLEAN DEFAULT false,
  sellado_at TIMESTAMP WITH TIME ZONE,
  sellado_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Fuente y validación
  fuente VARCHAR(50) DEFAULT 'BCV_OFFICIAL',
  validado BOOLEAN DEFAULT false,
  observaciones TEXT,

  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: TFHKA_AUDIT (Auditoría TFHKA)
-- =====================================================
CREATE TABLE IF NOT EXISTS tfhka_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Documento relacionado
  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('invoice', 'credit_note', 'debit_note', 'customer_sync')),
  document_id UUID, -- Puede ser invoice_id, customer_id, etc.
  document_number VARCHAR(50),

  -- Operación TFHKA
  tfhka_operation VARCHAR(50) NOT NULL,
  tfhka_document_id VARCHAR(100),
  tfhka_request JSONB,
  tfhka_response JSONB,

  -- Estado y resultado
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'error', 'retry')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timing
  request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  response_timestamp TIMESTAMP WITH TIME ZONE,

  -- Usuario
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: CUSTOMER_AUDIT (Auditoría de Clientes)
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,

  -- Operación realizada
  operation VARCHAR(20) NOT NULL CHECK (operation IN ('create', 'update', 'delete', 'rif_validation', 'tfhka_sync')),

  -- Datos antes y después
  old_data JSONB,
  new_data JSONB,

  -- Cambios específicos
  changes JSONB, -- Campos que cambiaron

  -- Usuario y contexto
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,

  -- Metadatos
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: ITEM_FISCAL_DATA (Datos Fiscales de Items)
-- =====================================================
CREATE TABLE IF NOT EXISTS item_fiscal_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE UNIQUE,

  -- Códigos SENIAT
  codigo_seniat VARCHAR(20) REFERENCES seniat_codes(codigo) ON DELETE SET NULL,
  categoria_seniat VARCHAR(20) CHECK (categoria_seniat IN ('bien', 'servicio', 'importado', 'exento')),

  -- Configuración fiscal
  unidad_medida VARCHAR(10) DEFAULT 'UND',
  origen_fiscal VARCHAR(20) DEFAULT 'nacional' CHECK (origen_fiscal IN ('nacional', 'importado', 'mixto')),

  -- IVA y retenciones
  alicuota_iva DECIMAL(5,2) DEFAULT 16.00,
  exento_iva BOOLEAN DEFAULT false,
  motivo_exencion TEXT,

  -- ISLR (Impuesto Sobre la Renta)
  sujeto_retencion_islr BOOLEAN DEFAULT false,
  porcentaje_retencion_islr DECIMAL(5,2) DEFAULT 0,
  concepto_islr VARCHAR(10), -- Código de concepto SENIAT

  -- Metadatos
  validado_seniat BOOLEAN DEFAULT false,
  fecha_validacion DATE,
  observaciones_fiscales TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: FISCAL_DOCUMENTS (Documentos Fiscales)
-- =====================================================
CREATE TABLE IF NOT EXISTS fiscal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relación con factura
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,

  -- Identificación fiscal
  numero_control VARCHAR(50) NOT NULL UNIQUE,
  serie VARCHAR(10) NOT NULL,
  numero_documento VARCHAR(50) NOT NULL,

  -- Fechas fiscales
  fecha_emision TIMESTAMP WITH TIME ZONE NOT NULL,
  periodo_fiscal VARCHAR(7) NOT NULL, -- YYYY-MM format

  -- Estado fiscal
  estado_fiscal VARCHAR(20) NOT NULL DEFAULT 'emitido'
    CHECK (estado_fiscal IN ('emitido', 'anulado', 'enviado_seniat', 'rechazado_seniat')),

  -- TFHKA Integration
  tfhka_document_id VARCHAR(100),
  tfhka_status VARCHAR(20),
  tfhka_response JSONB,
  qr_code TEXT,

  -- Tasa de cambio sellada
  tasa_bcv_sellada DECIMAL(10,4) NOT NULL,
  fecha_tasa_bcv DATE NOT NULL,

  -- Totales en monedas
  total_bolivares DECIMAL(15,2) NOT NULL,
  total_usd_referencia DECIMAL(15,2) NOT NULL,

  -- Auditoría
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- EXTENDER TABLA CUSTOMERS (Nuevos campos Phase 2)
-- =====================================================
-- Agregar campos sin afectar datos existentes
DO $$
BEGIN
    -- RIF validation status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'customers' AND column_name = 'rif_validado') THEN
        ALTER TABLE customers ADD COLUMN rif_validado BOOLEAN DEFAULT false;
    END IF;

    -- TFHKA sync status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'customers' AND column_name = 'tfhka_sincronizado') THEN
        ALTER TABLE customers ADD COLUMN tfhka_sincronizado BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'customers' AND column_name = 'tfhka_customer_id') THEN
        ALTER TABLE customers ADD COLUMN tfhka_customer_id VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'customers' AND column_name = 'tfhka_ultima_sincronizacion') THEN
        ALTER TABLE customers ADD COLUMN tfhka_ultima_sincronizacion TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Enhanced contact info
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'customers' AND column_name = 'telefono_movil') THEN
        ALTER TABLE customers ADD COLUMN telefono_movil VARCHAR(20);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'customers' AND column_name = 'contacto_nombre') THEN
        ALTER TABLE customers ADD COLUMN contacto_nombre VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'customers' AND column_name = 'contacto_cargo') THEN
        ALTER TABLE customers ADD COLUMN contacto_cargo VARCHAR(100);
    END IF;

    -- Business classification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'customers' AND column_name = 'sector_economico') THEN
        ALTER TABLE customers ADD COLUMN sector_economico VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'customers' AND column_name = 'activo') THEN
        ALTER TABLE customers ADD COLUMN activo BOOLEAN DEFAULT true;
    END IF;

    RAISE NOTICE 'Customer table extended successfully';
END
$$;

-- =====================================================
-- EXTENDER TABLA ITEMS (Nuevos campos Phase 2)
-- =====================================================
DO $$
BEGIN
    -- Fiscal classification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'items' AND column_name = 'clasificacion_fiscal') THEN
        ALTER TABLE items ADD COLUMN clasificacion_fiscal VARCHAR(20) DEFAULT 'bien';
    END IF;

    -- Enhanced pricing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'items' AND column_name = 'precio_usd') THEN
        ALTER TABLE items ADD COLUMN precio_usd DECIMAL(15,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'items' AND column_name = 'costo_unitario') THEN
        ALTER TABLE items ADD COLUMN costo_unitario DECIMAL(15,2);
    END IF;

    -- Inventory fields (if not from missing tables)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'items' AND column_name = 'maneja_inventario') THEN
        ALTER TABLE items ADD COLUMN maneja_inventario BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'items' AND column_name = 'activo') THEN
        ALTER TABLE items ADD COLUMN activo BOOLEAN DEFAULT true;
    END IF;

    RAISE NOTICE 'Items table extended successfully';
END
$$;

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para SENIAT_CODES
CREATE INDEX IF NOT EXISTS idx_seniat_codes_codigo ON seniat_codes(codigo);
CREATE INDEX IF NOT EXISTS idx_seniat_codes_categoria ON seniat_codes(categoria);
CREATE INDEX IF NOT EXISTS idx_seniat_codes_activo ON seniat_codes(activo);

-- Índices para BCV_RATES
CREATE INDEX IF NOT EXISTS idx_bcv_rates_fecha ON bcv_rates(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_bcv_rates_sellado ON bcv_rates(sellado);
CREATE INDEX IF NOT EXISTS idx_bcv_rates_validado ON bcv_rates(validado);

-- Índices para TFHKA_AUDIT
CREATE INDEX IF NOT EXISTS idx_tfhka_audit_document ON tfhka_audit(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_tfhka_audit_status ON tfhka_audit(status);
CREATE INDEX IF NOT EXISTS idx_tfhka_audit_timestamp ON tfhka_audit(request_timestamp DESC);

-- Índices para CUSTOMER_AUDIT
CREATE INDEX IF NOT EXISTS idx_customer_audit_customer_id ON customer_audit(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_audit_operation ON customer_audit(operation);
CREATE INDEX IF NOT EXISTS idx_customer_audit_created ON customer_audit(created_at DESC);

-- Índices para ITEM_FISCAL_DATA
CREATE INDEX IF NOT EXISTS idx_item_fiscal_data_item_id ON item_fiscal_data(item_id);
CREATE INDEX IF NOT EXISTS idx_item_fiscal_data_seniat ON item_fiscal_data(codigo_seniat);
CREATE INDEX IF NOT EXISTS idx_item_fiscal_data_categoria ON item_fiscal_data(categoria_seniat);

-- Índices para FISCAL_DOCUMENTS
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_invoice ON fiscal_documents(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_control ON fiscal_documents(numero_control);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_periodo ON fiscal_documents(periodo_fiscal);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_estado ON fiscal_documents(estado_fiscal);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_tfhka ON fiscal_documents(tfhka_document_id);

-- Índices para campos extendidos
CREATE INDEX IF NOT EXISTS idx_customers_rif_validado ON customers(rif_validado);
CREATE INDEX IF NOT EXISTS idx_customers_tfhka_sync ON customers(tfhka_sincronizado);
CREATE INDEX IF NOT EXISTS idx_customers_activo ON customers(activo);
CREATE INDEX IF NOT EXISTS idx_items_clasificacion ON items(clasificacion_fiscal);
CREATE INDEX IF NOT EXISTS idx_items_activo ON items(activo);

-- =====================================================
-- TRIGGERS PARA updated_at
-- =====================================================
CREATE TRIGGER update_seniat_codes_updated_at
BEFORE UPDATE ON seniat_codes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bcv_rates_updated_at
BEFORE UPDATE ON bcv_rates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_item_fiscal_data_updated_at
BEFORE UPDATE ON item_fiscal_data
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fiscal_documents_updated_at
BEFORE UPDATE ON fiscal_documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE seniat_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bcv_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tfhka_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_fiscal_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_documents ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS DE SEGURIDAD (Desarrollo: acceso abierto)
-- =====================================================

-- SENIAT_CODES policies
DROP POLICY IF EXISTS "Enable all for seniat_codes" ON seniat_codes;
CREATE POLICY "Enable all for seniat_codes"
ON seniat_codes FOR ALL
USING (true) WITH CHECK (true);

-- BCV_RATES policies
DROP POLICY IF EXISTS "Enable all for bcv_rates" ON bcv_rates;
CREATE POLICY "Enable all for bcv_rates"
ON bcv_rates FOR ALL
USING (true) WITH CHECK (true);

-- TFHKA_AUDIT policies
DROP POLICY IF EXISTS "Enable all for tfhka_audit" ON tfhka_audit;
CREATE POLICY "Enable all for tfhka_audit"
ON tfhka_audit FOR ALL
USING (true) WITH CHECK (true);

-- CUSTOMER_AUDIT policies
DROP POLICY IF EXISTS "Enable all for customer_audit" ON customer_audit;
CREATE POLICY "Enable all for customer_audit"
ON customer_audit FOR ALL
USING (true) WITH CHECK (true);

-- ITEM_FISCAL_DATA policies
DROP POLICY IF EXISTS "Enable all for item_fiscal_data" ON item_fiscal_data;
CREATE POLICY "Enable all for item_fiscal_data"
ON item_fiscal_data FOR ALL
USING (true) WITH CHECK (true);

-- FISCAL_DOCUMENTS policies
DROP POLICY IF EXISTS "Enable all for fiscal_documents" ON fiscal_documents;
CREATE POLICY "Enable all for fiscal_documents"
ON fiscal_documents FOR ALL
USING (true) WITH CHECK (true);

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Códigos SENIAT comunes
INSERT INTO seniat_codes (codigo, descripcion, categoria, alicuota_iva_default) VALUES
('84710000', 'Servicios de consultoría en informática', 'servicio', 16.00),
('84710001', 'Desarrollo de software y aplicaciones', 'servicio', 16.00),
('85249900', 'Software empaquetado', 'bien', 16.00),
('62010000', 'Programación informática', 'servicio', 16.00),
('62020000', 'Consultoría informática', 'servicio', 16.00),
('62030000', 'Gestión de instalaciones informáticas', 'servicio', 16.00),
('62090000', 'Otras actividades de tecnología', 'servicio', 16.00),
('58210000', 'Edición de videojuegos', 'bien', 16.00),
('58290000', 'Edición de otros programas informáticos', 'bien', 16.00),
('00000000', 'Producto genérico', 'bien', 16.00),
('99999999', 'Servicio genérico', 'servicio', 16.00)
ON CONFLICT (codigo) DO NOTHING;

-- Tasa BCV actual (ejemplo)
INSERT INTO bcv_rates (fecha, tasa_usd, tasa_eur, fuente, validado) VALUES
(CURRENT_DATE, 36.50, 39.20, 'BCV_OFFICIAL', true),
(CURRENT_DATE - INTERVAL '1 day', 36.45, 39.15, 'BCV_OFFICIAL', true),
(CURRENT_DATE - INTERVAL '2 days', 36.40, 39.10, 'BCV_OFFICIAL', true)
ON CONFLICT (fecha) DO NOTHING;

-- Datos fiscales para items existentes
INSERT INTO item_fiscal_data (
    item_id,
    codigo_seniat,
    categoria_seniat,
    alicuota_iva,
    sujeto_retencion_islr,
    porcentaje_retencion_islr
)
SELECT
    i.id,
    CASE
        WHEN i.tipo = 'servicio' THEN '99999999'
        ELSE '00000000'
    END,
    CASE
        WHEN i.tipo = 'servicio' THEN 'servicio'
        ELSE 'bien'
    END,
    16.00,
    CASE WHEN i.tipo = 'servicio' THEN true ELSE false END,
    CASE WHEN i.tipo = 'servicio' THEN 2.00 ELSE 0.00 END
FROM items i
WHERE NOT EXISTS (
    SELECT 1 FROM item_fiscal_data ifd WHERE ifd.item_id = i.id
);

-- =====================================================
-- FUNCIONES AUXILIARES
-- =====================================================

-- Función para obtener la tasa BCV actual
CREATE OR REPLACE FUNCTION get_current_bcv_rate()
RETURNS DECIMAL(10,4) AS $$
DECLARE
    current_rate DECIMAL(10,4);
BEGIN
    SELECT tasa_usd INTO current_rate
    FROM bcv_rates
    WHERE fecha <= CURRENT_DATE
    AND validado = true
    ORDER BY fecha DESC
    LIMIT 1;

    IF current_rate IS NULL THEN
        -- Valor por defecto si no hay tasa
        current_rate := 36.50;
    END IF;

    RETURN current_rate;
END;
$$ LANGUAGE plpgsql;

-- Función para sellar tasa BCV en documento fiscal
CREATE OR REPLACE FUNCTION seal_bcv_rate_for_document(
    p_invoice_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    current_rate DECIMAL(10,4);
    rate_date DATE;
BEGIN
    -- Obtener tasa actual
    SELECT tasa_usd, fecha INTO current_rate, rate_date
    FROM bcv_rates
    WHERE fecha <= CURRENT_DATE
    AND validado = true
    ORDER BY fecha DESC
    LIMIT 1;

    IF current_rate IS NULL THEN
        RAISE EXCEPTION 'No hay tasa BCV disponible para la fecha actual';
    END IF;

    -- Marcar la tasa como sellada
    UPDATE bcv_rates
    SET sellado = true,
        sellado_at = NOW(),
        sellado_by = p_user_id
    WHERE fecha = rate_date;

    -- Actualizar la factura con la tasa sellada
    UPDATE invoices
    SET tasa_bcv = current_rate,
        fecha_tasa_bcv = rate_date
    WHERE id = p_invoice_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
SELECT
    'seniat_codes' as tabla, COUNT(*) as registros FROM seniat_codes
UNION ALL
SELECT 'bcv_rates', COUNT(*) FROM bcv_rates
UNION ALL
SELECT 'tfhka_audit', COUNT(*) FROM tfhka_audit
UNION ALL
SELECT 'customer_audit', COUNT(*) FROM customer_audit
UNION ALL
SELECT 'item_fiscal_data', COUNT(*) FROM item_fiscal_data
UNION ALL
SELECT 'fiscal_documents', COUNT(*) FROM fiscal_documents;

-- =====================================================
-- FIN DEL SCRIPT PHASE 2 EXTENSIONS
-- =====================================================
-- Nuevas funcionalidades disponibles:
-- ✅ Códigos SENIAT y categorías fiscales
-- ✅ Gestión completa de tasas BCV con sellado
-- ✅ Auditoría completa de operaciones TFHKA
-- ✅ Datos fiscales extendidos para items y customers
-- ✅ Sistema de documentos fiscales
-- ✅ Funciones auxiliares para operaciones fiscales
-- =====================================================