-- =====================================================
-- SOLUCIÓN DEFINITIVA PARA PERMISOS RLS
-- =====================================================
-- Este script debe ejecutarse en el SQL Editor de Supabase
-- para dar permisos completos al rol anon

-- PASO 1: Eliminar políticas existentes si hay alguna
DROP POLICY IF EXISTS "allow_all_facturas" ON facturas_electronicas;
DROP POLICY IF EXISTS "allow_all_items" ON facturas_items;
DROP POLICY IF EXISTS "allow_all_formas_pago" ON facturas_formas_pago;
DROP POLICY IF EXISTS "allow_all_descuentos" ON facturas_descuentos;
DROP POLICY IF EXISTS "allow_all_impuestos" ON facturas_impuestos_subtotal;

-- PASO 2: Asegurar que RLS esté habilitado
ALTER TABLE facturas_electronicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_formas_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_descuentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_impuestos_subtotal ENABLE ROW LEVEL SECURITY;

-- PASO 3: Dar permisos GRANT al rol anon
GRANT ALL ON facturas_electronicas TO anon;
GRANT ALL ON facturas_items TO anon;
GRANT ALL ON facturas_formas_pago TO anon;
GRANT ALL ON facturas_descuentos TO anon;
GRANT ALL ON facturas_impuestos_subtotal TO anon;

GRANT ALL ON facturas_electronicas TO authenticated;
GRANT ALL ON facturas_items TO authenticated;
GRANT ALL ON facturas_formas_pago TO authenticated;
GRANT ALL ON facturas_descuentos TO authenticated;
GRANT ALL ON facturas_impuestos_subtotal TO authenticated;

-- PASO 4: Crear políticas permisivas para TODOS los roles
CREATE POLICY "allow_anon_all_facturas"
ON facturas_electronicas
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_anon_all_items"
ON facturas_items
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_anon_all_formas_pago"
ON facturas_formas_pago
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_anon_all_descuentos"
ON facturas_descuentos
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "allow_anon_all_impuestos"
ON facturas_impuestos_subtotal
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- PASO 5: Verificar que todo esté correcto
SELECT 'Políticas creadas:' as status;

SELECT
  tablename,
  policyname,
  permissive,
  roles
FROM pg_policies
WHERE tablename IN (
  'facturas_electronicas',
  'facturas_items',
  'facturas_formas_pago',
  'facturas_descuentos',
  'facturas_impuestos_subtotal'
)
ORDER BY tablename;

SELECT 'Permisos del rol anon:' as status;

SELECT
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name IN (
  'facturas_electronicas',
  'facturas_items',
  'facturas_formas_pago',
  'facturas_descuentos',
  'facturas_impuestos_subtotal'
)
AND grantee = 'anon'
ORDER BY table_name, privilege_type;
