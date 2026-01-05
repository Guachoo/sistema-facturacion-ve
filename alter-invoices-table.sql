-- =====================================================
-- AGREGAR COLUMNAS FALTANTES A TABLA INVOICES EXISTENTE
-- =====================================================
-- Este script agrega todas las columnas necesarias sin borrar la tabla

-- Agregar columnas básicas
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS numero VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS numero_control VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Datos del emisor
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS emisor_nombre VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS emisor_rif VARCHAR(20);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS emisor_domicilio TEXT;

-- Datos del receptor
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS receptor_rif VARCHAR(20);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS receptor_razon_social VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS receptor_domicilio TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS receptor_tipo_contribuyente VARCHAR(20);

-- Datos de la factura
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS lineas JSONB;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pagos JSONB;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS monto_iva DECIMAL(12, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS monto_igtf DECIMAL(12, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total DECIMAL(12, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_usd_referencia DECIMAL(12, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tasa_bcv DECIMAL(12, 4);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fecha_tasa_bcv DATE;

-- Control y canal
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS canal VARCHAR(20) DEFAULT 'digital';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'emitida';

-- Notas de crédito/débito
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS factura_afectada_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS factura_afectada_numero VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tipo_nota VARCHAR(20);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS motivo_nota TEXT;

-- Agregar restricciones (eliminar primero si existen)
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_receptor_tipo_contribuyente_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_receptor_tipo_contribuyente_check
  CHECK (receptor_tipo_contribuyente IS NULL OR receptor_tipo_contribuyente IN ('especial', 'ordinario', 'formal'));

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_canal_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_canal_check
  CHECK (canal IN ('digital', 'maquina'));

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_estado_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_estado_check
  CHECK (estado IN ('emitida', 'nota_credito', 'nota_debito'));

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_tipo_nota_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_tipo_nota_check
  CHECK (tipo_nota IS NULL OR tipo_nota IN ('credito', 'debito'));

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_invoices_numero ON invoices(numero);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_fecha ON invoices(fecha);
CREATE INDEX IF NOT EXISTS idx_invoices_estado ON invoices(estado);

-- Deshabilitar RLS
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- Dar permisos
GRANT ALL PRIVILEGES ON TABLE invoices TO anon;
GRANT ALL PRIVILEGES ON TABLE invoices TO authenticated;

-- Verificar columnas
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;
