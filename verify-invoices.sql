-- =====================================================
-- VERIFICAR FACTURAS EN AMBAS TABLAS
-- =====================================================

-- Ver facturas en tabla invoices
SELECT 'INVOICES TABLE' as tabla, COUNT(*) as total_registros
FROM invoices;

SELECT 'INVOICES - Primeros 5 registros' as info;
SELECT id, numero, fecha, total
FROM invoices
ORDER BY created_at DESC
LIMIT 5;

-- Ver facturas en tabla facturas_electronicas
SELECT 'FACTURAS_ELECTRONICAS TABLE' as tabla, COUNT(*) as total_registros
FROM facturas_electronicas;

SELECT 'FACTURAS_ELECTRONICAS - Primeros 5 registros' as info;
SELECT id, numero_documento, serie, fecha_emision, total_a_pagar
FROM facturas_electronicas
ORDER BY created_at DESC
LIMIT 5;
