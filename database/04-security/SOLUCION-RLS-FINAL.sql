-- =====================================
-- SOLUCIÓN FINAL RLS - ERROR DE ELIMINACIÓN
-- =====================================

-- El error "record new has no field created_by" indica que:
-- 1. Las políticas RLS están habilitadas
-- 2. Pero tienen problemas con campos que no existen

-- =====================================
-- OPCIÓN 1: VERIFICAR ESTADO ACTUAL
-- =====================================

-- Ver si RLS está habilitado
SELECT schemaname, tablename, rowsecurity, hasrls
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('customers', 'items', 'quotations', 'users')
ORDER BY tablename;

-- Ver políticas existentes
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('customers', 'items', 'quotations', 'users')
ORDER BY tablename, cmd;

-- =====================================
-- OPCIÓN 2: DESHABILITAR RLS TEMPORALMENTE (DESARROLLO)
-- =====================================

-- SOLO PARA DESARROLLO - PERMITE TODAS LAS OPERACIONES
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items DISABLE ROW LEVEL SECURITY;

-- =====================================
-- OPCIÓN 3: RECREAR POLÍTICAS SIMPLES
-- =====================================

-- Eliminar políticas problemáticas
DROP POLICY IF EXISTS "customers_delete_permissive" ON customers;
DROP POLICY IF EXISTS "items_delete_permissive" ON items;
DROP POLICY IF EXISTS "quotations_delete_permissive" ON quotations;
DROP POLICY IF EXISTS "users_delete_permissive" ON users;

-- Crear políticas súper simples
CREATE POLICY "allow_all_customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_items" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_quotations" ON quotations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_users" ON users FOR ALL USING (true) WITH CHECK (true);

-- =====================================
-- VERIFICACIÓN FINAL
-- =====================================

-- Verificar que todo esté correcto
SELECT
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
AND t.tablename IN ('customers', 'items', 'quotations', 'users')
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;