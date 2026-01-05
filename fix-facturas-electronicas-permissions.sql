-- =====================================================
-- CONFIGURAR PERMISOS PARA TABLA FACTURAS_ELECTRONICAS
-- =====================================================

-- Deshabilitar RLS (Row Level Security)
ALTER TABLE facturas_electronicas DISABLE ROW LEVEL SECURITY;

-- Dar todos los permisos a los roles anon y authenticated
GRANT ALL PRIVILEGES ON TABLE facturas_electronicas TO anon;
GRANT ALL PRIVILEGES ON TABLE facturas_electronicas TO authenticated;

-- Dar permisos a la secuencia si existe
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verificar permisos
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name='facturas_electronicas';
