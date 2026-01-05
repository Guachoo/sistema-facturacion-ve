-- =====================================================
-- ELIMINAR COLUMNAS DUPLICADAS EN INVOICES
-- =====================================================
-- La tabla tiene tanto 'numero' como 'numero_factura'
-- Necesitamos mantener solo 'numero' y eliminar 'numero_factura'

-- Primero, verificar qué columnas existen
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invoices'
  AND column_name LIKE '%numero%'
ORDER BY column_name;

-- Eliminar la restricción NOT NULL de numero_factura si existe
ALTER TABLE invoices ALTER COLUMN numero_factura DROP NOT NULL;

-- Eliminar la columna numero_factura
ALTER TABLE invoices DROP COLUMN IF EXISTS numero_factura;

-- Asegurarse de que 'numero' no sea NULL
ALTER TABLE invoices ALTER COLUMN numero SET NOT NULL;

-- Verificar el resultado
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'invoices'
  AND column_name LIKE '%numero%'
ORDER BY column_name;
