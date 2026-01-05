-- =====================================================
-- DIAGNÓSTICO COMPLETO DEL PROBLEMA
-- =====================================================
-- Ejecuta este script completo y envíame TODOS los resultados

-- 1. Verificar que la factura existe en la base de datos
SELECT '=== 1. FACTURA EN LA BASE DE DATOS ===' as diagnostico;
SELECT
  id,
  numero_documento,
  serie,
  cliente_razon_social,
  total_a_pagar,
  estado,
  anulado,
  created_at
FROM facturas_electronicas
WHERE numero_documento = '00000001'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Verificar RLS está habilitado
SELECT '=== 2. ESTADO DE RLS ===' as diagnostico;
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename IN ('facturas_electronicas', 'facturas_items')
ORDER BY tablename;

-- 3. Verificar políticas creadas
SELECT '=== 3. POLÍTICAS RLS CREADAS ===' as diagnostico;
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as comando
FROM pg_policies
WHERE tablename IN ('facturas_electronicas', 'facturas_items')
ORDER BY tablename, policyname;

-- 4. Verificar permisos GRANT del rol anon
SELECT '=== 4. PERMISOS DEL ROL ANON ===' as diagnostico;
SELECT
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('facturas_electronicas', 'facturas_items')
AND grantee = 'anon'
ORDER BY table_name, privilege_type;

-- 5. Verificar permisos del rol authenticated
SELECT '=== 5. PERMISOS DEL ROL AUTHENTICATED ===' as diagnostico;
SELECT
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('facturas_electronicas', 'facturas_items')
AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;

-- 6. Probar consulta como anon (simular lo que hace la API)
SELECT '=== 6. PRUEBA DE CONSULTA COMO ANON ===' as diagnostico;
SET ROLE anon;
SELECT
  id,
  numero_documento,
  serie,
  cliente_razon_social,
  total_a_pagar
FROM facturas_electronicas
ORDER BY fecha_emision DESC
LIMIT 5;
RESET ROLE;

-- 7. Verificar items de la factura
SELECT '=== 7. ITEMS DE LA FACTURA ===' as diagnostico;
SELECT
  COUNT(*) as total_items
FROM facturas_items
WHERE factura_id IN (
  SELECT id FROM facturas_electronicas WHERE numero_documento = '00000001'
);
