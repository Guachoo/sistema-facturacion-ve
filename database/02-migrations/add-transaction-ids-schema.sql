-- =====================================================
-- AGREGAR TRANSACTION IDs AL SCHEMA EXISTENTE
-- =====================================================
-- Este script agrega los campos de transaction_id a las tablas existentes
-- Para integrar completamente el sistema de Transaction IDs

-- =====================================================
-- 1. AGREGAR TRANSACTION_ID A INVOICES
-- =====================================================
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100) UNIQUE;

-- Crear índice para búsquedas rápidas por transaction_id
CREATE INDEX IF NOT EXISTS idx_invoices_transaction_id
ON invoices(transaction_id);

-- =====================================================
-- 2. CREAR TABLA QUOTATIONS CON TRANSACTION_ID
-- =====================================================
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(50) NOT NULL UNIQUE,
  transaction_id VARCHAR(100) UNIQUE, -- ✅ NUEVO

  -- Cliente
  cliente_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  cliente_nombre VARCHAR(255) NOT NULL,
  cliente_email VARCHAR(255),
  cliente_rif VARCHAR(20),
  cliente_domicilio TEXT,

  -- Fechas
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  fecha_vencimiento TIMESTAMP WITH TIME ZONE NOT NULL,
  valida_hasta TIMESTAMP WITH TIME ZONE,

  -- Estado
  estado VARCHAR(20) NOT NULL CHECK (estado IN ('borrador', 'enviada', 'aprobada', 'rechazada', 'convertida')),

  -- Totales
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  descuento_global DECIMAL(15,2) DEFAULT 0,
  iva DECIMAL(15,2) NOT NULL DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Vendedor
  vendedor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  vendedor_nombre VARCHAR(255) NOT NULL,

  -- Observaciones
  observaciones TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CREAR TABLA QUOTATION_ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,

  -- Datos del item
  codigo VARCHAR(50) NOT NULL,
  descripcion TEXT NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  precio_unitario DECIMAL(15,2) NOT NULL,
  descuento DECIMAL(5,2) DEFAULT 0,

  -- Cálculos
  subtotal DECIMAL(15,2) NOT NULL,
  monto_iva DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. CREAR TABLA DOCUMENT_VOIDS (ANULACIONES)
-- =====================================================
CREATE TABLE IF NOT EXISTS document_voids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Documento original
  original_document_type VARCHAR(20) NOT NULL CHECK (original_document_type IN ('invoice', 'quotation')),
  original_document_id UUID, -- Puede referenciar invoices o quotations
  original_transaction_id VARCHAR(100) NOT NULL,

  -- Detalles de anulación
  void_transaction_id VARCHAR(100) UNIQUE NOT NULL, -- ✅ TRANSACTION ID DE ANULACIÓN
  void_reason TEXT NOT NULL,
  void_date TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Usuario que anula
  voided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  voided_by_name VARCHAR(255) NOT NULL,

  -- Auditoría
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. CREAR TABLA DOCUMENT_DOWNLOADS (DESCARGAS)
-- =====================================================
CREATE TABLE IF NOT EXISTS document_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Documento descargado
  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('invoice', 'quotation')),
  document_id UUID,
  transaction_id VARCHAR(100) NOT NULL, -- ✅ BÚSQUEDA POR TRANSACTION ID
  document_number VARCHAR(50) NOT NULL,

  -- Detalles de descarga
  file_format VARCHAR(10) NOT NULL CHECK (file_format IN ('pdf', 'xml', 'json', 'zip')),
  file_size INTEGER,

  -- Usuario que descarga
  downloaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  downloaded_by_name VARCHAR(255) NOT NULL,

  -- Auditoría
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para quotations
CREATE INDEX IF NOT EXISTS idx_quotations_numero ON quotations(numero);
CREATE INDEX IF NOT EXISTS idx_quotations_transaction_id ON quotations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_quotations_cliente_id ON quotations(cliente_id);
CREATE INDEX IF NOT EXISTS idx_quotations_estado ON quotations(estado);
CREATE INDEX IF NOT EXISTS idx_quotations_fecha ON quotations(fecha_creacion DESC);

-- Índices para quotation_items
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_item_id ON quotation_items(item_id);

-- Índices para document_voids
CREATE INDEX IF NOT EXISTS idx_document_voids_original_transaction ON document_voids(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_document_voids_void_transaction ON document_voids(void_transaction_id);
CREATE INDEX IF NOT EXISTS idx_document_voids_date ON document_voids(void_date DESC);

-- Índices para document_downloads
CREATE INDEX IF NOT EXISTS idx_document_downloads_transaction ON document_downloads(transaction_id);
CREATE INDEX IF NOT EXISTS idx_document_downloads_date ON document_downloads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_downloads_user ON document_downloads(downloaded_by);

-- =====================================================
-- 7. TRIGGERS PARA updated_at
-- =====================================================
CREATE TRIGGER IF NOT EXISTS update_quotations_updated_at
BEFORE UPDATE ON quotations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_voids ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_downloads ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para desarrollo
CREATE POLICY IF NOT EXISTS "Enable all for quotations"
ON quotations FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Enable all for quotation_items"
ON quotation_items FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Enable all for document_voids"
ON document_voids FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Enable all for document_downloads"
ON document_downloads FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 9. DATOS DE PRUEBA CON TRANSACTION IDs
-- =====================================================

-- Cotización de ejemplo con transaction_id
INSERT INTO quotations (
  numero,
  transaction_id,
  cliente_nombre,
  cliente_rif,
  fecha_creacion,
  fecha_vencimiento,
  estado,
  subtotal,
  iva,
  total,
  vendedor_nombre
) VALUES (
  'COT-000001',
  'ANU_' || TO_CHAR(NOW(), 'YYYYMMDD') || '01_COT00000001',
  'Cliente Ejemplo',
  'J-12345678-9',
  NOW(),
  NOW() + INTERVAL '30 days',
  'borrador',
  1000.00,
  160.00,
  1160.00,
  'Vendedor Demo'
) ON CONFLICT (numero) DO NOTHING;

-- =====================================================
-- 10. VERIFICACIÓN
-- =====================================================
SELECT
  'quotations' as tabla, count(*) as registros
FROM quotations
UNION ALL
SELECT 'quotation_items', count(*) FROM quotation_items
UNION ALL
SELECT 'document_voids', count(*) FROM document_voids
UNION ALL
SELECT 'document_downloads', count(*) FROM document_downloads;

-- =====================================================
-- RESUMEN DE CAMBIOS
-- =====================================================
/*
✅ AGREGADO:
1. Campo transaction_id en tabla invoices
2. Tabla quotations completa con transaction_id
3. Tabla quotation_items para líneas de cotización
4. Tabla document_voids para anulaciones con transaction_id
5. Tabla document_downloads para auditoría de descargas
6. Índices optimizados para búsquedas por transaction_id
7. Políticas de seguridad RLS
8. Datos de prueba con transaction_ids

🎯 RESULTADO:
- Sistema completamente integrado con Transaction IDs
- Trazabilidad completa de documentos
- Auditoría de anulaciones y descargas
- Búsquedas optimizadas por transaction_id
- Compatible con todos los JSONs analizados
*/