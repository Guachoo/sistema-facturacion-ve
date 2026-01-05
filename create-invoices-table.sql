-- =====================================================
-- CREAR TABLA INVOICES COMPLETA
-- =====================================================
-- Este script crea la tabla invoices con todas las columnas necesarias

-- Primero, verificar si la tabla existe y qué columnas tiene
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;

-- Si la tabla no existe o está incompleta, crearla desde cero
-- NOTA: Si ya tienes datos en la tabla, NO ejecutes el DROP TABLE

-- Opción 1: Si la tabla NO existe, créala:
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(50) NOT NULL,
  numero_control VARCHAR(50) NOT NULL,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Datos del emisor
  emisor_nombre VARCHAR(255),
  emisor_rif VARCHAR(20),
  emisor_domicilio TEXT,

  -- Datos del receptor
  customer_id UUID REFERENCES customers(id),
  receptor_rif VARCHAR(20),
  receptor_razon_social VARCHAR(255),
  receptor_domicilio TEXT,
  receptor_tipo_contribuyente VARCHAR(20) CHECK (receptor_tipo_contribuyente IN ('especial', 'ordinario', 'formal')),

  -- Datos de la factura
  lineas JSONB,
  pagos JSONB,
  subtotal DECIMAL(12, 2),
  monto_iva DECIMAL(12, 2),
  monto_igtf DECIMAL(12, 2),
  total DECIMAL(12, 2),
  total_usd_referencia DECIMAL(12, 2),
  tasa_bcv DECIMAL(12, 4),
  fecha_tasa_bcv DATE,

  -- Control y canal
  canal VARCHAR(20) DEFAULT 'digital' CHECK (canal IN ('digital', 'maquina')),
  estado VARCHAR(20) DEFAULT 'emitida' CHECK (estado IN ('emitida', 'nota_credito', 'nota_debito')),

  -- Notas de crédito/débito
  factura_afectada_id UUID REFERENCES invoices(id),
  factura_afectada_numero VARCHAR(50),
  tipo_nota VARCHAR(20) CHECK (tipo_nota IS NULL OR tipo_nota IN ('credito', 'debito')),
  motivo_nota TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_invoices_numero ON invoices(numero);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_fecha ON invoices(fecha);
CREATE INDEX IF NOT EXISTS idx_invoices_estado ON invoices(estado);

-- Deshabilitar RLS para permitir acceso con anon key
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- Dar permisos a los roles
GRANT ALL PRIVILEGES ON TABLE invoices TO anon;
GRANT ALL PRIVILEGES ON TABLE invoices TO authenticated;

-- Verificar que la tabla se creó correctamente
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;
