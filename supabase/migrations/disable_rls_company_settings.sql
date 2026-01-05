-- =====================================================
-- DESACTIVAR RLS TEMPORALMENTE (SOLO DESARROLLO)
-- =====================================================

-- ⚠️ ADVERTENCIA: Esto permite acceso sin restricciones
-- Solo usar en desarrollo, NO en producción

ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'company_settings';

SELECT 'RLS desactivado exitosamente para company_settings' as status;
