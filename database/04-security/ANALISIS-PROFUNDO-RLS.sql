-- =====================================
-- ANÁLISIS PROFUNDO DEL ERROR RLS - DIAGNÓSTICO COMPLETO
-- =====================================
-- Error persistente: "record \"new\" has no field \"created_by\""
-- A pesar de aplicar múltiples soluciones

-- =====================================
-- PASO 1: DIAGNÓSTICO COMPLETO DE POLÍTICAS
-- =====================================

-- Ver TODAS las políticas existentes en el sistema (no solo las visibles)
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
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- =====================================
-- PASO 2: VERIFICAR ESTADO DE RLS
-- =====================================

-- Ver estado de Row Level Security en todas las tablas
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasrls
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================
-- PASO 3: VERIFICAR ESTRUCTURA DE TABLA CUSTOMERS
-- =====================================

-- Ver TODOS los campos de la tabla customers
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'customers'
ORDER BY ordinal_position;

-- =====================================
-- PASO 4: VERIFICAR TRIGGERS QUE PUEDEN CAUSAR EL ERROR
-- =====================================

-- Ver triggers en la tabla customers que pueden estar buscando 'created_by'
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'customers';

-- =====================================
-- PASO 5: VERIFICAR FUNCIONES/PROCEDIMIENTOS
-- =====================================

-- Buscar funciones que puedan contener referencias a 'created_by'
SELECT
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_definition ILIKE '%created_by%';

-- =====================================
-- PASO 6: BUSCAR POLÍTICAS OCULTAS O HEREDADAS
-- =====================================

-- Ver políticas del sistema que pueden estar aplicándose
SELECT
    p.polname AS policy_name,
    p.polrelid::regclass AS table_name,
    p.polcmd AS command,
    p.polpermissive AS permissive,
    p.polroles AS roles,
    p.polqual AS using_expression,
    p.polwithcheck AS check_expression
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'customers';

-- =====================================
-- PASO 7: VERIFICAR EXTENSIONES QUE PUEDEN INTERFERIR
-- =====================================

-- Ver extensiones instaladas que pueden crear políticas automáticas
SELECT
    extname,
    extversion
FROM pg_extension
WHERE extname IN ('supabase_vault', 'pgsodium', 'pg_graphql');

-- =====================================
-- PASO 8: BUSCAR REFERENCIAS A 'created_by' EN TODO EL ESQUEMA
-- =====================================

-- Buscar cualquier definición que mencione 'created_by'
SELECT
    'CONSTRAINT' as object_type,
    conname as object_name,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE pg_get_constraintdef(oid) ILIKE '%created_by%'

UNION ALL

SELECT
    'INDEX' as object_type,
    indexname as object_name,
    tablename as table_name,
    indexdef as definition
FROM pg_indexes
WHERE schemaname = 'public'
AND indexdef ILIKE '%created_by%'

UNION ALL

SELECT
    'VIEW' as object_type,
    table_name as object_name,
    table_name as table_name,
    view_definition as definition
FROM information_schema.views
WHERE table_schema = 'public'
AND view_definition ILIKE '%created_by%';

-- =====================================
-- SOLUCIÓN RADICAL: DESHABILITAR RLS COMPLETAMENTE
-- =====================================

-- SOLO EJECUTAR SI TODO LO ANTERIOR NO FUNCIONA
-- ADVERTENCIA: Esto deshabilita la seguridad RLS completamente

-- ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE quotations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- =====================================
-- VERIFICACIÓN FINAL
-- =====================================

-- Después de ejecutar lo anterior, verificar que no hay políticas activas
SELECT 'No policies found' as message
WHERE NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'customers'
);

-- Verificar que RLS está deshabilitado
SELECT
    tablename,
    rowsecurity as rls_disabled_should_be_false
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'customers';