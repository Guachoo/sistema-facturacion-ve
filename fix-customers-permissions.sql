-- =====================================================
-- SOLUCIÓN: DESHABILITAR RLS PARA LA TABLA CUSTOMERS
-- =====================================================
-- Esto permite que el usuario anon pueda insertar/actualizar/eliminar clientes

-- Deshabilitar RLS en la tabla customers
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está deshabilitado
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'customers';

-- Si rowsecurity = false, entonces está deshabilitado y debería funcionar

-- Dar permisos explícitos al rol anon
GRANT ALL PRIVILEGES ON TABLE customers TO anon;
GRANT ALL PRIVILEGES ON TABLE customers TO authenticated;

-- Verificar permisos
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'customers';
