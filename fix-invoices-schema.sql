-- =====================================================
-- AGREGAR COLUMNAS FALTANTES A LA TABLA INVOICES
-- =====================================================
-- Este script agrega todas las columnas necesarias para el sistema de facturación

-- Agregar columnas del emisor
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS emisor_nombre VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS emisor_rif VARCHAR(20);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS emisor_domicilio TEXT;

-- Agregar columnas del receptor
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS receptor_rif VARCHAR(20);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS receptor_razon_social VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS receptor_domicilio TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS receptor_tipo_contribuyente VARCHAR(20);

-- Agregar columnas de datos de la factura
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS lineas JSONB;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pagos JSONB;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS monto_iva DECIMAL(12, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS monto_igtf DECIMAL(12, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total DECIMAL(12, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_usd_referencia DECIMAL(12, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tasa_bcv DECIMAL(12, 4);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fecha_tasa_bcv DATE;

-- Agregar columnas de control
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'emitida';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS factura_afectada_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS factura_afectada_numero VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tipo_nota VARCHAR(20);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS motivo_nota TEXT;

-- Agregar restricciones
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_estado_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_estado_check
  CHECK (estado IN ('emitida', 'nota_credito', 'nota_debito'));

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_tipo_nota_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_tipo_nota_check
  CHECK (tipo_nota IS NULL OR tipo_nota IN ('credito', 'debito'));

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_receptor_tipo_contribuyente_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_receptor_tipo_contribuyente_check
  CHECK (receptor_tipo_contribuyente IN ('especial', 'ordinario', 'formal'));

-- Verificar las columnas agregadas
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;
