-- =====================================================
-- AGREGAR COLUMNA BASE_IMPONIBLE A INVOICES
-- =====================================================
-- Esta columna falta en la tabla pero el sistema espera tenerla

-- Agregar la columna base_imponible
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS base_imponible DECIMAL(12, 2);

-- Verificar todas las columnas que tienen restricción NOT NULL
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'invoices'
  AND is_nullable = 'NO'
ORDER BY column_name;

-- Eliminar restricciones NOT NULL de columnas opcionales si existen
-- (para evitar futuros errores con columnas que no enviamos)
ALTER TABLE invoices ALTER COLUMN base_imponible DROP NOT NULL;

-- Verificar el resultado
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;
