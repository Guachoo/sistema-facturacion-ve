-- =====================================================
-- SOLUCIÓN ALTERNATIVA - DESHABILITAR RLS TEMPORALMENTE
-- =====================================================
-- Si las políticas no funcionan, podemos deshabilitar RLS
-- SOLO PARA DESARROLLO mientras probamos

-- OPCIÓN 1: Deshabilitar RLS completamente (MÁS SIMPLE)
-- Ejecuta esto si quieres probar rápidamente:

ALTER TABLE facturas_electronicas DISABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_formas_pago DISABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_descuentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_impuestos_subtotal DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está deshabilitado
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN (
  'facturas_electronicas',
  'facturas_items',
  'facturas_formas_pago',
  'facturas_descuentos',
  'facturas_impuestos_subtotal'
)
ORDER BY tablename;

-- Si rowsecurity = false, entonces está deshabilitado y debería funcionar
