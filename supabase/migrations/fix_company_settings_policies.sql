-- =====================================================
-- ARREGLAR POLÍTICAS RLS DE COMPANY_SETTINGS
-- =====================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Usuarios pueden leer configuración de empresa" ON company_settings;
DROP POLICY IF EXISTS "Usuarios pueden actualizar configuración de empresa" ON company_settings;
DROP POLICY IF EXISTS "Permitir inserción inicial" ON company_settings;

-- OPCIÓN 1: Políticas permisivas para desarrollo (más fácil)
-- Descomentar estas si quieres permitir acceso a todos los usuarios autenticados

CREATE POLICY "Permitir lectura a todos los autenticados"
  ON company_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Permitir actualización a todos los autenticados"
  ON company_settings
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir inserción a todos los autenticados"
  ON company_settings
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (id = 1);

-- VERIFICAR: Si sigues teniendo problemas, desactiva RLS temporalmente
-- SOLO PARA DESARROLLO - NO USAR EN PRODUCCIÓN
-- ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;

-- Verificar políticas
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
WHERE tablename = 'company_settings';
