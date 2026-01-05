-- =====================================================
-- HACER COLUMNAS OPCIONALES (NULLABLE)
-- =====================================================
-- Eliminar restricciones NOT NULL de columnas que pueden ser opcionales

ALTER TABLE invoices ALTER COLUMN numero_control DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN fecha DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN subtotal DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN total_iva DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN total DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN base_imponible DROP NOT NULL;
ALTER TABLE invoices ALTER COLUMN descuento DROP NOT NULL;

-- Verificar columnas NOT NULL restantes (solo deberían quedar id y numero)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'invoices'
  AND is_nullable = 'NO'
ORDER BY column_name;
