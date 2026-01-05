-- =====================================================
-- SOLUCIÓN: DESHABILITAR RLS PARA LA TABLA ITEMS
-- =====================================================
-- Esto permite que el usuario anon pueda insertar/actualizar/eliminar items

-- Deshabilitar RLS en la tabla items
ALTER TABLE items DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está deshabilitado
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'items';

-- Si rowsecurity = false, entonces está deshabilitado y debería funcionar

-- Opcional: También puedes dar permisos explícitos al rol anon
GRANT ALL PRIVILEGES ON TABLE items TO anon;
GRANT ALL PRIVILEGES ON TABLE items TO authenticated;

-- Verificar permisos
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'items';
