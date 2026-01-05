-- =====================================================
-- SISTEMA DE FACTURACIÓN VENEZOLANO - SUPABASE SCHEMA
-- =====================================================

-- Eliminar tablas si existen (para poder recrear)
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS company_settings CASCADE;
DROP TABLE IF EXISTS control_number_batches CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- TABLA: USERS (USUARIOS DEL SISTEMA)
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('administrador', 'vendedor', 'promotor', 'contador')),
  activo BOOLEAN DEFAULT true,
  ultimo_acceso TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsqueda rápida por email
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_rol ON users(rol);
CREATE INDEX idx_users_activo ON users(activo);

-- Insertar usuario administrador por defecto
INSERT INTO users (nombre, email, password_hash, rol) VALUES
('Administrador', 'admin@axiona.com', '$2a$10$dummyhash', 'administrador');

-- =====================================================
-- TABLA: CUSTOMERS (CLIENTES)
-- =====================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rif VARCHAR(20) NOT NULL UNIQUE,
  razon_social VARCHAR(255) NOT NULL,
  nombre VARCHAR(255),
  domicilio TEXT NOT NULL,
  telefono VARCHAR(50),
  email VARCHAR(255),
  tipo_contribuyente VARCHAR(20) NOT NULL CHECK (tipo_contribuyente IN ('especial', 'ordinario', 'formal')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: ITEMS (PRODUCTOS/SERVICIOS)
-- =====================================================
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('producto', 'servicio')),
  moneda VARCHAR(3) NOT NULL DEFAULT 'VES' CHECK (moneda IN ('VES', 'USD')),
  precio_usd DECIMAL(15,2),
  precio_base DECIMAL(15,2) NOT NULL,
  iva_aplica BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: INVOICES (FACTURAS)
-- =====================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(50) NOT NULL UNIQUE,
  numero_control VARCHAR(50) NOT NULL UNIQUE,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Emisor
  emisor_nombre VARCHAR(255) NOT NULL,
  emisor_rif VARCHAR(20) NOT NULL,
  emisor_domicilio TEXT NOT NULL,

  -- Receptor
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  receptor_rif VARCHAR(20) NOT NULL,
  receptor_razon_social VARCHAR(255) NOT NULL,
  receptor_domicilio TEXT NOT NULL,
  receptor_tipo_contribuyente VARCHAR(20) NOT NULL,

  -- Líneas (JSON)
  lineas JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Pagos (JSON)
  pagos JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Totales
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  monto_iva DECIMAL(15,2) NOT NULL DEFAULT 0,
  monto_igtf DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_usd_referencia DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Tasa BCV
  tasa_bcv DECIMAL(10,4) NOT NULL,
  fecha_tasa_bcv DATE NOT NULL,

  -- Metadata
  canal VARCHAR(20) NOT NULL CHECK (canal IN ('digital', 'maquina')),
  estado VARCHAR(20) NOT NULL CHECK (estado IN ('emitida', 'nota_credito', 'nota_debito')),

  -- Para notas de crédito/débito
  factura_afectada_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  factura_afectada_numero VARCHAR(50),
  tipo_nota VARCHAR(20) CHECK (tipo_nota IN ('credito', 'debito')),
  motivo_nota TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: COMPANY_SETTINGS (CONFIGURACIÓN EMPRESA)
-- =====================================================
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social VARCHAR(255) NOT NULL,
  rif VARCHAR(20) NOT NULL,
  domicilio_fiscal TEXT NOT NULL,
  telefonos VARCHAR(255),
  email VARCHAR(255),
  logo TEXT,
  condiciones_venta TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: CONTROL_NUMBER_BATCHES (LOTES DE NUMERACIÓN)
-- =====================================================
CREATE TABLE control_number_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  range_from INTEGER NOT NULL,
  range_to INTEGER NOT NULL,
  active BOOLEAN DEFAULT false,
  used INTEGER DEFAULT 0,
  remaining INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX idx_customers_rif ON customers(rif);
CREATE INDEX idx_customers_created ON customers(created_at DESC);

CREATE INDEX idx_items_codigo ON items(codigo);
CREATE INDEX idx_items_tipo ON items(tipo);
CREATE INDEX idx_items_created ON items(created_at DESC);

CREATE INDEX idx_invoices_numero ON invoices(numero);
CREATE INDEX idx_invoices_fecha ON invoices(fecha DESC);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_estado ON invoices(estado);
CREATE INDEX idx_invoices_canal ON invoices(canal);
CREATE INDEX idx_invoices_created ON invoices(created_at DESC);

-- =====================================================
-- FUNCIÓN PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- TRIGGERS PARA updated_at
-- =====================================================
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at
BEFORE UPDATE ON items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON company_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_control_number_batches_updated_at
BEFORE UPDATE ON control_number_batches
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE control_number_batches ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS DE SEGURIDAD (RLS POLICIES)
-- Modo desarrollo: Permitir todo acceso público
-- =====================================================

-- Políticas para CUSTOMERS
DROP POLICY IF EXISTS "Enable all for customers" ON customers;
CREATE POLICY "Enable all for customers"
ON customers FOR ALL
USING (true)
WITH CHECK (true);

-- Políticas para ITEMS
DROP POLICY IF EXISTS "Enable all for items" ON items;
CREATE POLICY "Enable all for items"
ON items FOR ALL
USING (true)
WITH CHECK (true);

-- Políticas para INVOICES
DROP POLICY IF EXISTS "Enable all for invoices" ON invoices;
CREATE POLICY "Enable all for invoices"
ON invoices FOR ALL
USING (true)
WITH CHECK (true);

-- Políticas para COMPANY_SETTINGS
DROP POLICY IF EXISTS "Enable all for company_settings" ON company_settings;
CREATE POLICY "Enable all for company_settings"
ON company_settings FOR ALL
USING (true)
WITH CHECK (true);

-- Políticas para CONTROL_NUMBER_BATCHES
DROP POLICY IF EXISTS "Enable all for control_number_batches" ON control_number_batches;
CREATE POLICY "Enable all for control_number_batches"
ON control_number_batches FOR ALL
USING (true)
WITH CHECK (true);

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Configuración de empresa por defecto
INSERT INTO company_settings (razon_social, rif, domicilio_fiscal, telefonos, email, condiciones_venta)
VALUES (
  'Mi Empresa C.A.',
  'J-12345678-9',
  'Caracas, Venezuela',
  '+58-212-1234567',
  'info@miempresa.com',
  'Condiciones de venta estándar'
);

-- Clientes de prueba
INSERT INTO customers (rif, razon_social, domicilio, tipo_contribuyente)
VALUES
  ('J-87654321-0', 'Cliente Demo C.A.', 'Valencia, Venezuela', 'ordinario'),
  ('V-12345678-9', 'Juan Pérez', 'Caracas, Venezuela', 'formal'),
  ('J-11111111-1', 'Empresa Especial S.A.', 'Maracaibo, Venezuela', 'especial');

-- Items/Productos de prueba
INSERT INTO items (codigo, descripcion, tipo, precio_base, iva_aplica)
VALUES
  ('SERV-001', 'Consultoría en Sistemas', 'servicio', 50000.00, true),
  ('PROD-001', 'Laptop HP', 'producto', 800000.00, true),
  ('SERV-002', 'Soporte Técnico', 'servicio', 30000.00, true),
  ('PROD-002', 'Mouse Inalámbrico', 'producto', 15000.00, true);

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
-- Verificar que todo se creó correctamente
SELECT
  'customers' as tabla, count(*) as registros FROM customers
UNION ALL
SELECT 'items', count(*) FROM items
UNION ALL
SELECT 'invoices', count(*) FROM invoices
UNION ALL
SELECT 'company_settings', count(*) FROM company_settings;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- Ahora puedes usar el sistema de facturación
-- Las tablas están listas y con permisos configurados