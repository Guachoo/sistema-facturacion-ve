-- =====================================================
-- VERIFICAR POLÍTICAS RLS Y PERMISOS
-- =====================================================

-- Ver todas las políticas creadas para las tablas de facturación
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN (
  'facturas_electronicas',
  'facturas_items',
  'facturas_formas_pago',
  'facturas_descuentos',
  'facturas_impuestos_subtotal'
)
ORDER BY tablename, policyname;

-- Ver si RLS está habilitado en las tablas
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN (
  'facturas_electronicas',
  'facturas_items',
  'facturas_formas_pago',
  'facturas_descuentos',
  'facturas_impuestos_subtotal'
);

-- Ver permisos del rol anon en las tablas
SELECT
  grantee,
  table_schema,
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
