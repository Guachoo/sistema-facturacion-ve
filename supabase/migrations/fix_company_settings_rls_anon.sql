-- Política RLS para company_settings con rol anon
-- ===================================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Usuarios pueden leer configuración de empresa" ON company_settings;
DROP POLICY IF EXISTS "Usuarios pueden actualizar configuración de empresa" ON company_settings;
DROP POLICY IF EXISTS "Permitir inserción inicial" ON company_settings;

-- Crear políticas para el rol 'anon' (acceso público sin autenticación)
CREATE POLICY "anon_select_company_settings"
ON company_settings FOR SELECT
TO anon
USING (true);

CREATE POLICY "anon_insert_company_settings"
ON company_settings FOR INSERT
TO anon
WITH CHECK (id = 1);

CREATE POLICY "anon_update_company_settings"
ON company_settings FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "anon_delete_company_settings"
ON company_settings FOR DELETE
TO anon
USING (true);

-- Verificar políticas
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'company_settings'
ORDER BY policyname;
