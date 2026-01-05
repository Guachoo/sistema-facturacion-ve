-- =====================================================
-- AGREGAR COLUMNAS CON NOMBRES CORRECTOS
-- =====================================================
-- El código envía: monto_iva, monto_igtf, total_usd_referencia, tasa_bcv, fecha_tasa_bcv
-- La tabla tiene: total_iva (y posiblemente faltan las otras)

-- Agregar columna monto_iva si no existe
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS monto_iva DECIMAL(12, 2);

-- Agregar columna monto_igtf si no existe
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS monto_igtf DECIMAL(12, 2);

-- Agregar columna total_usd_referencia si no existe
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_usd_referencia DECIMAL(12, 2);

-- Agregar columna tasa_bcv si no existe
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tasa_bcv DECIMAL(12, 4);

-- Agregar columna fecha_tasa_bcv si no existe
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS fecha_tasa_bcv DATE;

-- Verificar todas las columnas de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;
