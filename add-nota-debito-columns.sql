-- =====================================================
-- AGREGAR COLUMNAS PARA NOTAS DE DÉBITO/CRÉDITO
-- =====================================================

-- Agregar columnas para factura afectada
ALTER TABLE facturas_electronicas ADD COLUMN IF NOT EXISTS serie_factura_afectada VARCHAR(10);
ALTER TABLE facturas_electronicas ADD COLUMN IF NOT EXISTS numero_factura_afectada VARCHAR(50);
ALTER TABLE facturas_electronicas ADD COLUMN IF NOT EXISTS fecha_factura_afectada DATE;
ALTER TABLE facturas_electronicas ADD COLUMN IF NOT EXISTS monto_factura_afectada DECIMAL(12, 2);
ALTER TABLE facturas_electronicas ADD COLUMN IF NOT EXISTS comentario_factura_afectada TEXT;

-- Verificar las columnas agregadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'facturas_electronicas'
  AND column_name LIKE '%afectada%'
ORDER BY column_name;
