-- =====================================================
-- SOLUCIÓN SIMPLE: DESACTIVAR RLS TEMPORALMENTE
-- =====================================================

-- Desactivar RLS para company_settings
ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;

-- Verificar que se desactivó
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'company_settings';

-- Debería mostrar: rls_enabled = false
