-- =====================================================
-- TABLA DE CONFIGURACIÓN DE EMPRESA
-- =====================================================

-- Eliminar tabla si existe (para desarrollo)
DROP TABLE IF EXISTS company_settings CASCADE;

-- Crear tabla de configuración de empresa
CREATE TABLE company_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  razon_social VARCHAR(255) NOT NULL,
  rif VARCHAR(20) NOT NULL,
  domicilio_fiscal TEXT NOT NULL,
  telefonos VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  condiciones_venta TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint para asegurar que solo haya una fila
  CONSTRAINT single_row_company_settings CHECK (id = 1)
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_company_settings_id ON company_settings(id);

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_company_settings_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE company_settings IS 'Configuración de la empresa para facturas (solo una fila permitida)';
COMMENT ON COLUMN company_settings.razon_social IS 'Razón social de la empresa';
COMMENT ON COLUMN company_settings.rif IS 'RIF de la empresa';
COMMENT ON COLUMN company_settings.domicilio_fiscal IS 'Dirección fiscal de la empresa';
COMMENT ON COLUMN company_settings.telefonos IS 'Teléfonos de contacto';
COMMENT ON COLUMN company_settings.email IS 'Email de la empresa';
COMMENT ON COLUMN company_settings.condiciones_venta IS 'Condiciones de venta que aparecen en facturas';
COMMENT ON COLUMN company_settings.logo_url IS 'URL del logo de la empresa';

-- Habilitar Row Level Security
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Permitir lectura a usuarios autenticados
DROP POLICY IF EXISTS "Usuarios pueden leer configuración de empresa" ON company_settings;
CREATE POLICY "Usuarios pueden leer configuración de empresa"
  ON company_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para permitir actualizaciones a usuarios autenticados
DROP POLICY IF EXISTS "Usuarios pueden actualizar configuración de empresa" ON company_settings;
CREATE POLICY "Usuarios pueden actualizar configuración de empresa"
  ON company_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para permitir inserción (solo la primera vez)
DROP POLICY IF EXISTS "Permitir inserción inicial" ON company_settings;
CREATE POLICY "Permitir inserción inicial"
  ON company_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (id = 1);

-- Insertar configuración por defecto
INSERT INTO company_settings (
  id,
  razon_social,
  rif,
  domicilio_fiscal,
  telefonos,
  email,
  condiciones_venta
) VALUES (
  1,
  'GRU CORPORACIÓN NAUTICA DE SERVICIOS, C.A.',
  'J-50725064-4',
  'AV LA ESTANCIA CON CALLE BENERITO BLOHM CC CIUDAD TAMANACO. PIRAMIDE INVERTIDA NIVEL 6 OF 610 URB CHUAO CARACAS (CHACAO) MIRANDA ZONA POSTAL 1060',
  '+58-212-1234567 / +58-414-9876543',
  'grunautica@gmail.com',
  'Pago de contado. Precios incluyen IVA. Válido por 30 días.'
) ON CONFLICT (id) DO NOTHING;

-- Verificar que se creó correctamente
SELECT 'company_settings creada exitosamente' as status, count(*) as filas FROM company_settings;
