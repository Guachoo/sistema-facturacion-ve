-- =====================================
-- POLÍTICAS RLS PERMISIVAS (ALTERNATIVA)
-- Sistema de Facturación Venezolano
-- =====================================

-- USAR SOLO SI LAS POLÍTICAS PRINCIPALES FALLAN
-- Esta versión es más permisiva y permite eliminaciones
-- sin verificación estricta de autenticación

-- =====================================
-- VERSIÓN PERMISIVA - PARA DESARROLLO
-- =====================================

-- 1. CLIENTES - Versión permisiva
DROP POLICY IF EXISTS "customers_delete_authenticated" ON customers;
CREATE POLICY "customers_delete_permissive" ON customers
    FOR DELETE
    USING (true);

-- 2. PRODUCTOS - Versión permisiva
DROP POLICY IF EXISTS "items_delete_authenticated" ON items;
CREATE POLICY "items_delete_permissive" ON items
    FOR DELETE
    USING (true);

-- 3. COTIZACIONES - Versión permisiva
DROP POLICY IF EXISTS "quotations_delete_authenticated" ON quotations;
CREATE POLICY "quotations_delete_permissive" ON quotations
    FOR DELETE
    USING (true);

-- 4. USUARIOS - Versión permisiva
DROP POLICY IF EXISTS "users_delete_admin" ON users;
CREATE POLICY "users_delete_permissive" ON users
    FOR DELETE
    USING (true);

-- 5. QUOTATION ITEMS - Versión permisiva
DROP POLICY IF EXISTS "quotation_items_delete_authenticated" ON quotation_items;
CREATE POLICY "quotation_items_delete_permissive" ON quotation_items
    FOR DELETE
    USING (true);

-- 6. INVENTORY MOVEMENTS - Versión permisiva
DROP POLICY IF EXISTS "inventory_movements_delete_authenticated" ON inventory_movements;
CREATE POLICY "inventory_movements_delete_permissive" ON inventory_movements
    FOR DELETE
    USING (true);

-- Verificación
SELECT
    tablename,
    policyname,
    cmd,
    'PERMISIVA - true' as tipo_politica
FROM pg_policies
WHERE schemaname = 'public'
AND cmd = 'DELETE'
AND policyname LIKE '%_permissive'
ORDER BY tablename;

-- Mensaje de advertencia
DO $$
BEGIN
    RAISE NOTICE '⚠️  POLÍTICAS PERMISIVAS APLICADAS';
    RAISE NOTICE '   Estas políticas permiten eliminaciones sin restricciones';
    RAISE NOTICE '   Recomendado solo para desarrollo/pruebas';
    RAISE NOTICE '   En producción, usar las políticas con autenticación';
END $$;