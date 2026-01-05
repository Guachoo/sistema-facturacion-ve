-- =====================================================
-- AGREGAR COLUMNAS PARA INTEGRACIÓN CON TFHKA
-- =====================================================

-- Agregar columnas para timbrado TFHKA
ALTER TABLE facturas_electronicas ADD COLUMN IF NOT EXISTS transaccion_id VARCHAR(255);
ALTER TABLE facturas_electronicas ADD COLUMN IF NOT EXISTS url_pdf TEXT;

-- Crear índice para transaccion_id (para búsquedas rápidas)
CREATE INDEX IF NOT EXISTS idx_facturas_transaccion_id ON facturas_electronicas(transaccion_id);

-- Verificar las columnas agregadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'facturas_electronicas'
  AND column_name IN ('transaccion_id', 'url_pdf')
ORDER BY column_name;
