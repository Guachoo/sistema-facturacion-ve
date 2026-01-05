-- =====================================================
-- RENOMBRAR COLUMNAS DE INVOICES PARA COINCIDIR CON EL CÓDIGO
-- =====================================================
-- El código usa 'numero' y 'numero_control' pero la tabla tiene 'numero_factura'

-- Opción 1: Renombrar las columnas existentes para coincidir con el código
ALTER TABLE invoices RENAME COLUMN numero_factura TO numero;

-- Verificar si hay otras columnas que necesiten renombrarse
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'invoices'
  AND column_name LIKE '%numero%'
ORDER BY column_name;
