-- =====================================
-- SOLUCIÓN FINAL - ELIMINAR TODAS LAS POLÍTICAS Y RECREAR
-- =====================================
-- Ejecutar en Supabase SQL Editor paso a paso

-- =====================================
-- PASO 1: ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
-- =====================================

-- CUSTOMERS - Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "customers_delete_authenticated" ON customers;
DROP POLICY IF EXISTS "customers_delete_permissive" ON customers;
DROP POLICY IF EXISTS "allow_all_customers" ON customers;
DROP POLICY IF EXISTS "customers_all_operations" ON customers;

-- ITEMS - Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "items_delete_authenticated" ON items;
DROP POLICY IF EXISTS "items_delete_permissive" ON items;
DROP POLICY IF EXISTS "allow_all_items" ON items;
DROP POLICY IF EXISTS "items_all_operations" ON items;

-- QUOTATIONS - Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "quotations_delete_authenticated" ON quotations;
DROP POLICY IF EXISTS "quotations_delete_permissive" ON quotations;
DROP POLICY IF EXISTS "allow_all_quotations" ON quotations;
DROP POLICY IF EXISTS "quotations_all_operations" ON quotations;

-- USERS - Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "users_delete_admin" ON users;
DROP POLICY IF EXISTS "users_delete_permissive" ON users;
DROP POLICY IF EXISTS "allow_all_users" ON users;
DROP POLICY IF EXISTS "users_all_operations" ON users;

-- QUOTATION_ITEMS - Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "quotation_items_delete_authenticated" ON quotation_items;
DROP POLICY IF EXISTS "quotation_items_delete_permissive" ON quotation_items;
DROP POLICY IF EXISTS "quotation_items_all_operations" ON quotation_items;

-- INVENTORY_MOVEMENTS - Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "inventory_movements_delete_authenticated" ON inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_delete_permissive" ON inventory_movements;
DROP POLICY IF EXISTS "inventory_movements_all_operations" ON inventory_movements;

-- =====================================
-- PASO 2: CREAR UNA SOLA POLÍTICA SIMPLE POR TABLA
-- =====================================

-- CUSTOMERS
CREATE POLICY "customers_allow_all" ON customers
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ITEMS
CREATE POLICY "items_allow_all" ON items
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- QUOTATIONS
CREATE POLICY "quotations_allow_all" ON quotations
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- USERS
CREATE POLICY "users_allow_all" ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- QUOTATION_ITEMS (si existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotation_items') THEN
        EXECUTE 'CREATE POLICY "quotation_items_allow_all" ON quotation_items FOR ALL USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- INVENTORY_MOVEMENTS (si existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
        EXECUTE 'CREATE POLICY "inventory_movements_allow_all" ON inventory_movements FOR ALL USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- =====================================
-- PASO 3: VERIFICACIÓN
-- =====================================

-- Verificar políticas creadas
SELECT
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND policyname LIKE '%_allow_all'
ORDER BY tablename;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ TODAS LAS POLÍTICAS RECREADAS';
    RAISE NOTICE '   Una política simple por tabla';
    RAISE NOTICE '   Sin campos inexistentes';
    RAISE NOTICE '   Las eliminaciones deben funcionar';
END $$;