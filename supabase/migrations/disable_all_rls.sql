-- =====================================================
-- DESACTIVAR RLS COMPLETAMENTE EN TODAS LAS TABLAS
-- =====================================================

-- Desactivar RLS en exchange_rates
ALTER TABLE exchange_rates DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes en exchange_rates (si las hay)
DROP POLICY IF EXISTS "allow_all_exchange_rates" ON exchange_rates;
DROP POLICY IF EXISTS "Enable read access for all users" ON exchange_rates;
DROP POLICY IF EXISTS "Enable insert access for all users" ON exchange_rates;
DROP POLICY IF EXISTS "Enable update access for all users" ON exchange_rates;

-- Desactivar RLS en company_settings
ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes en company_settings (si las hay)
DROP POLICY IF EXISTS "allow_all_company_settings" ON company_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON company_settings;
DROP POLICY IF EXISTS "Enable insert access for all users" ON company_settings;
DROP POLICY IF EXISTS "Enable update access for all users" ON company_settings;

-- Verificar que RLS está desactivado
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('exchange_rates', 'company_settings');

-- Debería mostrar: rls_enabled = false para ambas tablas
